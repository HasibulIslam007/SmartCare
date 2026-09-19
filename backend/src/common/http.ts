import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Response } from "express";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler) {
    return next
      .handle()
      .pipe(
        map((data: unknown) => ({
          success: true,
          message: "Request successful",
          data,
        })),
      );
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof body === "string"
        ? body
        : body && typeof body === "object" && "message" in body
          ? body.message
          : "Internal server error";
    // Never expose SQL, credentials, request bodies, or internal exception messages.
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ success: false, message, data: null });
  }
}
