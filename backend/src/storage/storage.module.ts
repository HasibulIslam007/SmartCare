import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { LocalStorageProvider } from "./providers/local.provider";
import { S3StorageProvider } from "./providers/s3.provider";
import { DevelopmentVirusScanner } from "./scanner.service";
import { StorageService } from "./storage.service";
import { STORAGE_PROVIDER, VIRUS_SCANNER } from "./interfaces/storage.tokens";

@Module({
  providers: [
    StorageService,
    DevelopmentVirusScanner,
    { provide: VIRUS_SCANNER, useExisting: DevelopmentVirusScanner },
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>("STORAGE_PROVIDER", "local");
        if (provider === "local") return new LocalStorageProvider(config.get<string>("LOCAL_STORAGE_PATH"));
        if (provider !== "s3") throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
        const bucket = config.getOrThrow<string>("S3_BUCKET");
        return new S3StorageProvider(
          new S3Client({
            region: config.getOrThrow<string>("S3_REGION"),
            endpoint: config.get<string>("S3_ENDPOINT"),
            forcePathStyle: config.get<string>("S3_FORCE_PATH_STYLE", "false") === "true",
            credentials: config.get<string>("S3_ACCESS_KEY")
              ? { accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY"), secretAccessKey: config.getOrThrow<string>("S3_SECRET_KEY") }
              : undefined,
          }),
          bucket,
        );
      },
    },
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}