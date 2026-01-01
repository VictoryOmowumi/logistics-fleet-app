import crypto from "crypto";

export function createToken(ttlMs: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + ttlMs);
  return { token, tokenHash, expires };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
