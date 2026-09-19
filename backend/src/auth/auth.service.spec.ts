import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { PasswordService } from "./password.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
describe("AuthService", () => {
  it("uses the same error for unknown emails and wrong passwords", async () => {
    const findByEmail = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ passwordHash: "hash" });
    const verify = jest.fn().mockResolvedValue(false);
    const service = new AuthService(
      { findByEmail } as unknown as UsersService,
      { verify } as unknown as PasswordService,
      {} as JwtService,
    );
    for (let i = 0; i < 2; i++) {
      await expect(
        service.login({
          email: "unknown@example.com",
          password: "wrong-password",
        }),
      ).rejects.toEqual(new UnauthorizedException("Invalid email or password"));
    }
    expect(verify).toHaveBeenCalledTimes(2);
  });
});
