import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return response.status(status).send(typeof payload === "string" ? { statusCode: status, error: HttpStatus[status], message: payload } : payload);
    }
    // Keep response generic for clients but always log real server error for debugging.
    // eslint-disable-next-line no-console
    console.error("[UnhandledException]", exception);
    return response.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Unexpected error" });
  }
}
