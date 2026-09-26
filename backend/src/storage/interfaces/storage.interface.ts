export interface StorageProvider {
  upload(file: Buffer, key: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
  read(key: string): Promise<Buffer>;
}

export interface VirusScanner {
  scan(file: Buffer): Promise<ScanResult>;
}

export interface ScanResult {
  clean: boolean;
  reason?: string;
}

export interface StorageFile {
  file: Buffer;
  filename: string;
  mimeType: string;
}

export interface StorageValidationConfig {
  maxUploadSize: number;
  allowedFileTypes: readonly string[];
}

export interface StorageAuditMetadata {
  fileKey: string;
  uploadedBy: string;
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
  storageProvider: string;
}
