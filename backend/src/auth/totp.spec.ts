import { base32Decode, base32Encode, generateTotp, verifyTotp } from "./totp";

// RFC 6238 appendix B uses the ASCII secret "12345678901234567890" with SHA-1.
const rfcSecret = base32Decode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");

describe("base32", () => {
  it("matches RFC 4648 test vectors and round-trips", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("MZXW6YTBOI").toString()).toBe("foobar");
    expect(base32Decode("mzxw6ytboi=====").toString()).toBe("foobar");
    expect(base32Encode(rfcSecret)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base32Decode("MZXW6YTBO1")).toThrow("Invalid base32 secret");
  });
});

describe("TOTP", () => {
  it("reproduces the RFC 6238 SHA-1 test vectors", () => {
    const vectors: Array<[number, string]> = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
      [20000000000, "65353130"],
    ];
    for (const [seconds, expected] of vectors) {
      expect(generateTotp(rfcSecret, seconds * 1000, 8)).toBe(expected);
    }
  });

  it("emits six digits and accepts the current step", () => {
    const at = 1_700_000_000_000;
    const token = generateTotp(rfcSecret, at);
    expect(token).toMatch(/^\d{6}$/);
    expect(verifyTotp(rfcSecret, token, at)).toBe(true);
  });

  it("tolerates one step of clock drift but not more", () => {
    const at = 1_700_000_000_000;
    const token = generateTotp(rfcSecret, at);
    expect(verifyTotp(rfcSecret, token, at + 30_000)).toBe(true);
    expect(verifyTotp(rfcSecret, token, at - 30_000)).toBe(true);
    expect(verifyTotp(rfcSecret, token, at + 60_000)).toBe(false);
    expect(verifyTotp(rfcSecret, token, at + 120_000)).toBe(false);
  });

  it("rejects malformed or wrong-length tokens", () => {
    const at = 1_700_000_000_000;
    expect(verifyTotp(rfcSecret, "12345", at)).toBe(false);
    expect(verifyTotp(rfcSecret, "1234567", at)).toBe(false);
    expect(verifyTotp(rfcSecret, "abcdef", at)).toBe(false);
    expect(verifyTotp(rfcSecret, "", at)).toBe(false);
  });

  it("rejects a token generated from a different secret", () => {
    const at = 1_700_000_000_000;
    const other = base32Decode("MZXW6YTBOI");
    expect(verifyTotp(rfcSecret, generateTotp(other, at), at)).toBe(false);
  });
});
