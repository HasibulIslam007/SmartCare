import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { configureApp } from "./setup";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  // Bind all interfaces in production (Railway/Render/Fly) while keeping
  // local development on loopback when HOST is unset.
  const host =
    process.env.HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  await app.listen(
    app.get(ConfigService).getOrThrow<number>("PORT"),
    host,
  );
}
bootstrap().catch(() => {
  console.error(
    "API startup failed. Check configuration and database availability.",
  );
  process.exitCode = 1;
});
