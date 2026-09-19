import { randomUUID } from "node:crypto";
import { StorageFile, StorageValidationConfig } from "./interfaces/storage.interface";
import { StorageValidationError } from "./storage.errors";

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const DEFAULT_ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

const FILE_EXTENSIONS = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
]);

function extensionFor(filename: string): string {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!extension || extension.length > 10) {
    throw new StorageValidationError("File must have a valid extension");
  }
  return extension;
}

function hasValidSignature(file: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return file.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/jpeg") return file.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === "image/png") return file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

export function validateStorageFile(
  input: StorageFile,
  config: StorageValidationConfig = {
    maxUploadSize: DEFAULT_MAX_FILE_SIZE,
    allowedFileTypes: DEFAULT_ALLOWED_FILE_TYPES,
  },
): string {
  const extension = extensionFor(input.filename);
  const expectedExtension = FILE_EXTENSIONS.get(input.mimeType);
  if (!config.allowedFileTypes.includes(input.mimeType) || !expectedExtension || extension !== expectedExtension) {
    throw new StorageValidationError("File type and extension do not match an allowed medical document");
  }
  if (input.file.length === 0) throw new StorageValidationError("File cannot be empty");
  if (input.file.length > config.maxUploadSize) throw new StorageValidationError("File exceeds the configured upload limit");
  if (!hasValidSignature(input.file, input.mimeType)) {
    throw new StorageValidationError("File content does not match its declared type");
  }
  return `${randomUUID()}-report${expectedExtension}`;
}