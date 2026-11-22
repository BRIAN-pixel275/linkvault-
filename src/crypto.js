const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ITERATIONS = 600_000

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function createSalt() {
  return toBase64(randomBytes(16))
}

export async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(value, key) {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value)))
  return { payload: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) }
}

export async function decrypt(payload, iv, key) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(payload))
  return JSON.parse(decoder.decode(plaintext))
}

export function createRecoveryKey() {
  const raw = randomBytes(32)
  const hex = Array.from(raw, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return hex.match(/.{1,4}/g).join('-')
}

async function recoveryCryptoKey(recoveryKey) {
  const raw = Uint8Array.from(recoveryKey.replaceAll('-', '').match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16))
  if (raw.length !== 32) throw new Error('Recovery key should contain 64 hexadecimal characters.')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function wrapKey(key, recoveryKey) {
  const wrappingKey = await recoveryCryptoKey(recoveryKey)
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const iv = randomBytes(12)
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawKey)
  return { wrapped_key: toBase64(new Uint8Array(wrapped)), wrapped_key_iv: toBase64(iv) }
}

export async function unwrapKey(wrappedKey, iv, recoveryKey) {
  const wrappingKey = await recoveryCryptoKey(recoveryKey)
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, wrappingKey, fromBase64(wrappedKey))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}
