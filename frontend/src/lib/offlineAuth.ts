type OfflineUser = { id: string; displayName: string; email: string; roles: string[] };

export type OfflineAccess = {
  user: OfflineUser;
  expiresAtUtc: string;
};

type OfflineCredential = OfflineAccess & {
  version: 1;
  email: string;
  salt: string;
  verifier: string;
};

const OFFLINE_CREDENTIAL_KEY = 'nurtured-choice.offline-credential';
const OFFLINE_ACCESS_DAYS = 7;
const PBKDF2_ITERATIONS = 310_000;

function encode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function decode(value: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

async function deriveVerifier(password: string, salt: ArrayBuffer): Promise<string> {
  if (!crypto?.subtle) throw new Error('This browser cannot securely store offline access.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return encode(bits);
}

function readCredential(): OfflineCredential | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_CREDENTIAL_KEY);
    if (!raw) return null;
    const credential = JSON.parse(raw) as OfflineCredential;
    if (credential.version !== 1 || !credential.email || !credential.salt || !credential.verifier || !credential.user?.id || !credential.expiresAtUtc) return null;
    return credential;
  } catch {
    return null;
  }
}

function valuesMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function saveOfflineAccess(email: string, password: string, user: OfflineUser): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const expiresAtUtc = new Date(Date.now() + OFFLINE_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const credential: OfflineCredential = {
    version: 1,
    email: email.trim().toLowerCase(),
    user,
    salt: encode(salt.buffer),
    verifier: await deriveVerifier(password, salt.buffer),
    expiresAtUtc
  };
  window.localStorage.setItem(OFFLINE_CREDENTIAL_KEY, JSON.stringify(credential));
}

export function hasOfflineAccess(): boolean {
  const credential = readCredential();
  return Boolean(credential && new Date(credential.expiresAtUtc).getTime() > Date.now());
}

export async function verifyOfflineAccess(email: string, password: string): Promise<OfflineAccess> {
  const credential = readCredential();
  if (!credential) throw new Error('Offline sign-in is not set up on this device. Connect to the system and sign in first.');
  if (new Date(credential.expiresAtUtc).getTime() <= Date.now()) {
    throw new Error('Offline access has expired. Connect to the system and sign in again.');
  }
  if (credential.email !== email.trim().toLowerCase()) throw new Error('This account is not enabled for offline access on this device.');

  let verifier: string;
  try {
    verifier = await deriveVerifier(password, decode(credential.salt));
  } catch {
    throw new Error('Offline sign-in is unavailable in this browser. Connect to the system and sign in again.');
  }
  if (!valuesMatch(verifier, credential.verifier)) throw new Error('Incorrect password.');
  return { user: credential.user, expiresAtUtc: credential.expiresAtUtc };
}

export function clearOfflineAccess(): void {
  window.localStorage.removeItem(OFFLINE_CREDENTIAL_KEY);
}
