import { StorageProvider, VirusScanner } from "./interfaces/storage.interface";
import { StorageScanError, StorageValidationError } from "./storage.errors";
import { StorageService } from "./storage.service";

const pdf = (size = 5) => Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(Math.max(0, size - 9))]);

describe("StorageService", () => {
  let provider: jest.Mocked<StorageProvider>;
  let scanner: jest.Mocked<VirusScanner>;
  let service: StorageService;

  beforeEach(() => {
    provider = { upload: jest.fn(async (_file, key, _mimeType) => key), delete: jest.fn(), getSignedUrl: jest.fn(), read: jest.fn() };
    scanner = { scan: jest.fn().mockResolvedValue({ clean: true }) };
    service = new StorageService(provider, scanner);
  });

  it("uploads a validated file under a generated private key", async () => {
    const key = await service.uploadFile({ file: pdf(), filename: "../../patient.pdf", mimeType: "application/pdf" });
    expect(key).toMatch(/^[0-9a-f-]{36}-report\.pdf$/);
    expect(scanner.scan).toHaveBeenCalled();
    expect(provider.upload).toHaveBeenCalledWith(expect.any(Buffer), key, "application/pdf");
  });

  it("deletes objects and generates download URLs through the provider", async () => {
    provider.getSignedUrl.mockResolvedValue("signed-url");
    await service.deleteFile("safe-key");
    await expect(service.generateDownloadUrl("safe-key")).resolves.toBe("signed-url");
    expect(provider.delete).toHaveBeenCalledWith("safe-key");
    expect(provider.getSignedUrl).toHaveBeenCalledWith("safe-key");
  });

  it("reads file bytes through the provider", async () => {
    const bytes = pdf();
    provider.read.mockResolvedValue(bytes);
    await expect(service.readFile("safe-key")).resolves.toEqual(bytes);
    expect(provider.read).toHaveBeenCalledWith("safe-key");
  });

  it.each([
    [{ filename: "report.pdf", mimeType: "application/x-executable", file: pdf() }, "type"],
    [{ filename: "report.png", mimeType: "application/pdf", file: pdf() }, "extension"],
    [{ filename: "report.pdf", mimeType: "application/pdf", file: Buffer.from("not a pdf") }, "signature"],
    [{ filename: "report.pdf", mimeType: "application/pdf", file: Buffer.alloc(10 * 1024 * 1024 + 1) }, "size"],
  ])("rejects an invalid file (%s)", async (input) => {
    await expect(service.uploadFile(input)).rejects.toBeInstanceOf(StorageValidationError);
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("does not persist a file rejected by the scanner", async () => {
    scanner.scan.mockResolvedValue({ clean: false, reason: "test threat" });
    await expect(service.uploadFile({ file: pdf(), filename: "report.pdf", mimeType: "application/pdf" })).rejects.toEqual(new StorageScanError("test threat"));
    expect(provider.upload).not.toHaveBeenCalled();
  });
});
