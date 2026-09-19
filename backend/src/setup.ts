import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { ApiExceptionFilter, ResponseInterceptor } from "./common/http";

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(
    (
      _req: unknown,
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.enableCors({
    origin: app.get(ConfigService).getOrThrow<string>("CORS_ORIGIN"),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
}
