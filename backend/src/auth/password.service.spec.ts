import { PasswordService } from "./password.service";
describe("PasswordService", () => {
  const passwords = new PasswordService();
  it("salts Argon2id hashes and accepts only the correct password", async () => {
    const a = await passwords.hash("correct-password-123");
    const b = await passwords.hash("correct-password-123");
    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toEqual(b);
    expect(await passwords.verify(a, "correct-password-123")).toBe(true);
    expect(await passwords.verify(a, "wrong-password-123")).toBe(false);
    expect(await passwords.verify(undefined, "correct-password-123")).toBe(
      false,
    );
  });
});
