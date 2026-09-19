import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageProvider } from "./local.provider";

describe("LocalStorageProvider", () => {
  it("uploads and deletes an object within its configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "smartcare-storage-"));
    const provider = new LocalStorageProvider(root);
    const key = "uuid-report.pdf";
    const content = Buffer.from("synthetic report");

    await expect(provider.upload(content, key, "application/pdf")).resolves.toBe(key);
    await expect(readFile(join(root, key))).resolves.toEqual(content);
    await expect(provider.getSignedUrl(key)).resolves.toBe("local-storage://uuid-report.pdf");
    await expect(provider.delete(key)).resolves.toBeUndefined();
    await expect(provider.getSignedUrl(key)).rejects.toThrow();
  });

  it("rejects traversal keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "smartcare-storage-"));
    const provider = new LocalStorageProvider(root);

    await expect(provider.upload(Buffer.from("data"), "../outside", "text/plain")).rejects.toThrow("Invalid storage key");
  });
});