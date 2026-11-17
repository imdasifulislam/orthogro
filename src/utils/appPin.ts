export type PinLength = 4 | 6;

export interface AppPinRecord {
  hash: string;
  salt: string;
  length: PinLength;
  lockOnBackground: boolean;
  updatedAt: string;
}

const PIN_STORAGE_PREFIX = 'orthogro_app_pin_v1_';

export function getPinAccountKey(uid?: string | null): string {
  return uid ? uid : 'guest';
}

function getPinStorageKey(accountKey: string): string {
  return `${PIN_STORAGE_PREFIX}${accountKey}`;
}

function generateSaltHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Pure-JS SHA-256 fallback in case Web Crypto SubtleCrypto is unavailable in non-HTTPS contexts
function sha256FallbackHex(input: string): string {
  const utf8 = new TextEncoder().encode(input);
  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = utf8.length * 8;
  const paddedLen = Math.ceil((utf8.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(utf8);
  padded[utf8.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + k[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const payload = `orthogro-pin:${salt}:${pin}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fall through to deterministic SHA-256
    }
  }
  return sha256FallbackHex(payload);
}

export function readAppPinRecord(accountKey: string): AppPinRecord | null {
  try {
    const raw = localStorage.getItem(getPinStorageKey(accountKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppPinRecord>;
    if (
      typeof parsed.hash === 'string' &&
      parsed.hash.length > 0 &&
      typeof parsed.salt === 'string' &&
      parsed.salt.length > 0 &&
      (parsed.length === 4 || parsed.length === 6)
    ) {
      return {
        hash: parsed.hash,
        salt: parsed.salt,
        length: parsed.length,
        lockOnBackground: Boolean(parsed.lockOnBackground),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    }
  } catch {
    // ignore storage/parse errors
  }
  return null;
}

export async function saveAppPin(
  accountKey: string,
  pin: string,
  lockOnBackground = false
): Promise<AppPinRecord> {
  const length: PinLength = pin.length === 6 ? 6 : 4;
  const salt = generateSaltHex(16);
  const hash = await hashPinWithSalt(pin, salt);
  const record: AppPinRecord = {
    hash,
    salt,
    length,
    lockOnBackground,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(getPinStorageKey(accountKey), JSON.stringify(record));
  return record;
}

export async function verifyAppPin(accountKey: string, candidatePin: string): Promise<boolean> {
  const record = readAppPinRecord(accountKey);
  if (!record) return false;
  const candidateHash = await hashPinWithSalt(candidatePin, record.salt);
  return candidateHash === record.hash;
}

export function updateAppPinSettings(
  accountKey: string,
  patch: { lockOnBackground: boolean }
): AppPinRecord | null {
  const record = readAppPinRecord(accountKey);
  if (!record) return null;
  const updated: AppPinRecord = {
    ...record,
    lockOnBackground: patch.lockOnBackground,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(getPinStorageKey(accountKey), JSON.stringify(updated));
  return updated;
}

export function clearAppPin(accountKey: string): void {
  try {
    localStorage.removeItem(getPinStorageKey(accountKey));
  } catch {
    // ignore storage errors
  }
}
