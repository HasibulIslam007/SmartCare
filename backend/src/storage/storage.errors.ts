export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

export class StorageScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageScanError";
  }
}