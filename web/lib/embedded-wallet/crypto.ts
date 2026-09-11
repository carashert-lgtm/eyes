const PBKDF2_ITERATIONS = 310_000
const SALT_BYTES = 16
const IV_BYTES = 12

function b64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64Decode(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Encrypt a 32-byte hex private key (without 0x) with user password. */
export async function encryptPrivateKey(
  privateKeyHex: string,
  password: string,
): Promise<{ saltB64: string; ivB64: string; ciphertextB64: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt)
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(privateKeyHex),
  )
  return {
    saltB64: b64Encode(salt),
    ivB64: b64Encode(iv),
    ciphertextB64: b64Encode(new Uint8Array(ciphertext)),
  }
}

export async function decryptPrivateKey(
  password: string,
  saltB64: string,
  ivB64: string,
  ciphertextB64: string,
): Promise<string> {
  const salt = b64Decode(saltB64)
  const iv = b64Decode(ivB64)
  const ciphertext = b64Decode(ciphertextB64)
  const key = await deriveKey(password, salt)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return new TextDecoder().decode(plain)
}
