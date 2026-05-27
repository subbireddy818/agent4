import crypto from "crypto";

// -----------------------------------------------------------------------------
// Session JWTs (HS256) — no third-party JWT lib so we keep the dependency
// surface minimal and the cryptography auditable.
//
// Format: base64url(headerJSON).base64url(payloadJSON).base64url(hmacSig)
// Algorithm: HS256 (HMAC-SHA256) keyed by AUTH_SECRET.
//
// We sign the session cookie set after a successful OTP verification.
// Middleware and `/api/me` parse it back to identify the current user.
// -----------------------------------------------------------------------------

export interface SessionPayload {
  sub: string;        // profile.id
  phone: string;      // profile.phone, e.g. "+91 98765 43210"
  role: "agent" | "builder" | "admin" | "verification" | "operations";
  name: string;
  iat: number;        // issued-at, seconds since epoch
  exp: number;        // expiry, seconds since epoch
}

const SESSION_COOKIE_NAME = "agentsapp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const sessionCookieName = SESSION_COOKIE_NAME;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;

function getSecret(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with " +
        '`node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"` ' +
        "and set it in your environment."
    );
  }
  return Buffer.from(secret, "utf8");
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

/**
 * Sign an HS256 session JWT for the given user. Caller is responsible for
 * passing a fresh `iat` / `exp` if the defaults aren't appropriate.
 */
export function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(signingInput).digest();
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

/**
 * Verify and parse an HS256 JWT. Returns null on any failure
 * (bad signature, expired, malformed). Never throws.
 */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  let expectedSig: Buffer;
  try {
    expectedSig = crypto.createHmac("sha256", getSecret()).update(signingInput).digest();
  } catch {
    return null;
  }

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }

  if (expectedSig.length !== providedSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;

  return payload;
}

// -----------------------------------------------------------------------------
// OTP hashing — SHA-256(salt || otp). 6-digit OTPs over a 10-minute TTL with
// max 5 attempts don't need bcrypt's work factor; salted SHA-256 is fine.
// -----------------------------------------------------------------------------

export function generateOtp(): string {
  // Crypto-safe 6-digit code, zero-padded.
  return (crypto.randomInt(0, 1_000_000)).toString().padStart(6, "0");
}

export function hashOtp(otp: string, salt: string): string {
  return crypto.createHash("sha256").update(`${salt}${otp}`, "utf8").digest("hex");
}

export function newOtpSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
