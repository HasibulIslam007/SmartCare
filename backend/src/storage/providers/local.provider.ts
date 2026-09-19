import { Injectable } from "@nestjs/common";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { StorageProvider } from "../interfaces/storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootDirectory = join(process.cwd(), ".local", "storage", "reports")) {}

  private pathFor(key: string): string {
    const path = join(this.rootDirectory, key);
    const relativePath = relative(this.rootDirectory, path);
    if (isAbsolute(relativePath) || relativePath.startsWith("..")) throw new Error("Invalid storage key");
    return path;
  }

  async upload(file: Buffer, key: string, _mimeType: string): Promise<string> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file, { flag: "wx", mode: 0o600 });
    return key;
  }

  async delete(key: string): Promise<void> {
    await unlink(this.pathFor(key));
  }

  async getSignedUrl(key: string): Promise<string> {
    await readFile(this.pathFor(key));
    return `local-storage://${encodeURIComponent(key)}`;
  }
}