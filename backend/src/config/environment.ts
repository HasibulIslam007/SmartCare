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
  return {
    ...env,
    JWT_SECRET: secret,
    DATABASE_URL: databaseUrl,
    PORT: port,
    CORS_ORIGIN: origin,
  };
}
