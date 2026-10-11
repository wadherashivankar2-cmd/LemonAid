/**
 * Cryptographic HMAC-SHA256 signature and Base64URL encoding utilities.
 * Compatible with Node 20+, Edge Runtime, and modern browsers via Web Crypto API.
 */

const DEFAULT_SECRET = process.env.SHARE_SECRET || "dev_secret_key_must_be_shared_with_frontend";

export function base64UrlEncode(str: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  // Server-side / Node / Edge fallback
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  // Server-side / Node / Edge fallback
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function computeSig(
  brag: string,
  roast: string,
  secretKey = DEFAULT_SECRET
): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secretKey);
  const messageData = enc.encode(`${brag}\n${roast}`);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 32);
}

/**
 * Constant-time comparison to avoid timing attacks on signatures.
 */
export async function verifySig(
  brag: string,
  roast: string,
  candidateSig: string,
  secretKey = DEFAULT_SECRET
): Promise<boolean> {
  if (!candidateSig || candidateSig.length !== 32) {
    return false;
  }

  const expected = await computeSig(brag, roast, secretKey);
  if (expected.length !== candidateSig.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ candidateSig.charCodeAt(i);
  }
  return mismatch === 0;
}
