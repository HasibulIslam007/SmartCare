import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  base32Decode,
  base32Encode,
  generateTotp,
  verifyTotp,
} from "./totp";

const ISSUER = "SmartCare";
const DIGITS = 6;
const PERIOD = 30;

@Injectable()
export class TotpService {
  /** 160 bits of entropy, the length RFC 4226 recommends for HMAC-SHA1. */
  generateSecret() {
    return base32Encode(randomBytes(20));
  }

  /** otpauth URI that authenticator apps understand. */
  keyUri(secret: string, account: string) {
    const label = encodeURIComponent(`${ISSUER}:${account}`);
    const params = new URLSearchParams({
      secret,
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: String(DIGITS),
      period: String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  code(secret: string, at = Date.now()) {
    return generateTotp(base32Decode(secret), at, DIGITS, PERIOD);
  }

  verify(secret: string, token: string, at = Date.now()) {
    return verifyTotp(base32Decode(secret), token, at, DIGITS, PERIOD);
  }
}
