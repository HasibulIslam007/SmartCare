import { Injectable } from "@nestjs/common";
import { ScanResult, VirusScanner } from "./interfaces/storage.interface";

@Injectable()
export class DevelopmentVirusScanner implements VirusScanner {
  async scan(_file: Buffer): Promise<ScanResult> {
    return { clean: true };
  }
}