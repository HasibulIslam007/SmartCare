import { validateEnvironment } from "./environment";
describe("environment", () => {
  const env = {
    JWT_SECRET: "a".repeat(64),
    DATABASE_URL: "postgresql://localhost/test",
  };
  it("accepts explicit configuration and defaults the local port", () => {
    expect(validateEnvironment(env).PORT).toBe(3001);
  });
  it.each([
    { JWT_SECRET: "short" },
    { JWT_SECRET: "replace-with-a-random-secret-at-least-32-characters" },
    { DATABASE_URL: "sqlite://test" },
    { PORT: "NaN" },
    { CORS_ORIGIN: "*" },
  ])("rejects invalid configuration %j", (override) => {
    expect(() => validateEnvironment({ ...env, ...override })).toThrow();
  });

  it("normalizes and returns storage validation configuration", () => {
    expect(
      validateEnvironment({
        ...env,
        MAX_UPLOAD_SIZE: "1048576",
        ALLOWED_FILE_TYPES: "application/pdf, image/png",
      }),
    ).toMatchObject({
      MAX_UPLOAD_SIZE: 1048576,
      ALLOWED_FILE_TYPES: ["application/pdf", "image/png"],
    });
  });

  it.each([
    { MAX_UPLOAD_SIZE: "0" },
    { MAX_UPLOAD_SIZE: "10485761" },
    { ALLOWED_FILE_TYPES: "application/x-executable" },
    { ALLOWED_FILE_TYPES: "" },
  ])("rejects unsafe storage configuration %j", (override) => {
    expect(() => validateEnvironment({ ...env, ...override })).toThrow();
  });
});
