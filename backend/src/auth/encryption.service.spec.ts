import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "./encryption.service";

const config = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key], getOrThrow: (key: string) => env[key] }) as unknown as ConfigService;

describe("EncryptionService", () => {
  it("round-trips a sealed secret", () => {
    const service = new EncryptionService(
      config({ JWT_SECRET: "a".repeat(40) }),
    );
    const payload = service.seal("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(payload).not.toContain("GEZDGNBV");
    expect(service.open(payload)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("produces a different ciphertext each time", () => {
    const service = new EncryptionService(
      config({ JWT_SECRET: "a".repeat(40) }),
    );
    expect(service.seal("same")).not.toBe(service.seal("same"));
  });

  it("prefers a dedicated key over the JWT secret", () => {
    const withDedicated = new EncryptionService(
      config({ JWT_SECRET: "a".repeat(40), MFA_ENCRYPTION_KEY: "b".repeat(40) }),
    );
    const withJwt = new EncryptionService(config({ JWT_SECRET: "a".repeat(40) }));
    expect(() => withJwt.open(withDedicated.seal("secret"))).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const service = new EncryptionService(
      config({ JWT_SECRET: "a".repeat(40) }),
    );
    const [iv, sealed, tag] = service.seal("secret").split(".");
    const flipped = Buffer.from(sealed, "base64url");
    flipped[0] ^= 0xff;
    expect(() =>
      service.open(`${iv}.${flipped.toString("base64url")}.${tag}`),
    ).toThrow();
  });
});
