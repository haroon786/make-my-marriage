import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt}$${key.toString("hex")}`;
}
// An unknown account still performs one full password derivation.
const dummyHash = `scrypt$32768$8$3$${"0".repeat(32)}$${"0".repeat(128)}`;
export async function verifyPassword(password: string, encoded = dummyHash) {
  const valid = /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(
    encoded,
  );
  const [, , , , salt, expected] = (valid ? encoded : dummyHash).split("$");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && valid;
}
export const createToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
