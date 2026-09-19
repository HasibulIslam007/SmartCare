export function validateEnvironment(env: Record<string, unknown>) {
  const secret = String(env.JWT_SECRET ?? "");
  if (secret.length < 32 || secret.startsWith("replace-")) {
    throw new Error(
      "JWT_SECRET must be a random secret of at least 32 characters",
    );
  }
  const databaseUrl = String(env.DATABASE_URL ?? "");
  if (!/^postgres(ql)?:\/\//.test(databaseUrl))
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be a valid TCP port");
  const origin = String(env.CORS_ORIGIN ?? "http://localhost:3000");
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
    throw new Error("CORS_ORIGIN must be a single HTTP origin");
  const storageProvider = String(env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (!["local", "s3"].includes(storageProvider)) {
    throw new Error("STORAGE_PROVIDER must be local or s3");
  }
  if (storageProvider === "s3") {
    for (const name of ["S3_BUCKET", "S3_REGION"]) {
      if (!String(env[name] ?? "")) throw new Error(`${name} is required for S3 storage`);
    }
    if (Boolean(env.S3_ACCESS_KEY) !== Boolean(env.S3_SECRET_KEY)) {
      throw new Error("S3_ACCESS_KEY and S3_SECRET_KEY must be provided together");
    }
  }
  const maxUploadSize = Number(env.MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024);
  if (!Number.isSafeInteger(maxUploadSize) || maxUploadSize < 1 || maxUploadSize > 10 * 1024 * 1024) {
    throw new Error("MAX_UPLOAD_SIZE must be a positive integer no greater than 10 MB");
  }
  const allowedFileTypes = String(env.ALLOWED_FILE_TYPES ?? "application/pdf,image/jpeg,image/png")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const supportedFileTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!allowedFileTypes.length || allowedFileTypes.some((value) => !supportedFileTypes.has(value))) {
    throw new Error("ALLOWED_FILE_TYPES may contain only application/pdf, image/jpeg, and image/png");
  }
  return {
    ...env,
    JWT_SECRET: secret,
    DATABASE_URL: databaseUrl,
    PORT: port,
    CORS_ORIGIN: origin,
    STORAGE_PROVIDER: storageProvider,
    MAX_UPLOAD_SIZE: maxUploadSize,
    ALLOWED_FILE_TYPES: allowedFileTypes,
  };
}
