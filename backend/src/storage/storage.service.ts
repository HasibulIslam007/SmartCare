import { Inject, Injectable } from "@nestjs/common";
import { StorageProvider, StorageFile, StorageValidationConfig, VirusScanner } from "./interfaces/storage.interface";
import { STORAGE_PROVIDER, STORAGE_VALIDATION_CONFIG, VIRUS_SCANNER } from "./interfaces/storage.tokens";
import { StorageScanError } from "./storage.errors";
import { validateStorageFile } from "./storage.validation";

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
    @Inject(STORAGE_VALIDATION_CONFIG) private readonly validationConfig: StorageValidationConfig = {
      maxUploadSize: 10 * 1024 * 1024,
      allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
    },
  ) {}

  async uploadFile(input: StorageFile): Promise<string> {
    const key = validateStorageFile(input, this.validationConfig);
    const scan = await this.scanner.scan(input.file);
    if (!scan.clean) throw new StorageScanError(scan.reason ?? "File failed malware scanning");
    try {
      return await this.provider.upload(input.file, key, input.mimeType);
    } catch (error) {
      throw error;
    }
  }

  deleteFile(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  generateDownloadUrl(key: string): Promise<string> {
    return this.provider.getSignedUrl(key);
  }
}