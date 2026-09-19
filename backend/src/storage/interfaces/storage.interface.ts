export interface StorageProvider {
  upload(file: Buffer, key: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
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