import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  private readonly options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  };
  private dummyHash?: Promise<string>;
  hash(password: string) {
    return argon2.hash(password, this.options);
  }
  async verify(hash: string | undefined, password: string) {
    // Perform the same expensive operation for unknown accounts.
    this.dummyHash ??= this.hash("unused-dummy-password");
    const valid = await argon2.verify(hash ?? (await this.dummyHash), password);
    return hash !== undefined && valid;
  }
}
