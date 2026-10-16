/**
 * Local biometric unlock (fingerprint / device biometry) via the WebAuthn
 * platform authenticator — works in Android Chrome, iOS Safari, Windows Hello.
 *
 * Design notes:
 * - This is a LOCAL app-lock: the credential is registered once (with a
 *   user-verification-required platform authenticator) and its ID is stored
 *   in localStorage. Unlocking = a successful user-verified assertion.
 * - No server involvement; data never leaves the device. This matches the
 *   app's offline-first privacy model.
 * - APK phase: swap this adapter with the Capacitor native biometric plugin
 *   (@capacitor-community/native-biometric) behind the same 5 functions.
 */

const STORAGE_KEY = "bio-cred-id";

// ── base64url helpers (ArrayBuffer ⇄ string) ─────────────────
function b64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ── capability detection ─────────────────────────────────────
/** WebAuthn platform-authenticator support (secure context required). */
export function biometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  const pk = (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: unknown } })
    .PublicKeyCredential;
  if (!pk || typeof pk.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
  return true;
}

export function biometricRegistered(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

// ── register / authenticate / remove ─────────────────────────
/** Registers a platform credential guarded by the device biometry. */
export async function biometricRegister(): Promise<boolean> {
  if (!biometricSupported()) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "دستیار حسابیاری روزانه" },
      user: { id: userId, name: "local-unlock", displayName: "App unlock" },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "discouraged",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred || !cred.rawId) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, b64urlEncode(cred.rawId));
  } catch {
    return false;
  }
  return true;
}

/** Prompts the device biometry; resolves true on a user-verified assertion. */
export async function biometricAuthenticate(): Promise<boolean> {
  if (!biometricSupported() || !biometricRegistered()) return false;
  const idB64 = window.localStorage.getItem(STORAGE_KEY);
  if (!idB64) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: b64urlDecode(idB64), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  return !!assertion;
}

export function biometricRemove(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
