/**
 * Encryption layer for HealthArkiv
 *
 * Derives an AES-GCM key from the user's MetaMask signature on a
 * deterministic message. Only the wallet owner can decrypt their data.
 */

const ENCRYPTION_MESSAGE =
  'HealthArkiv encryption key v1 — sign this to unlock your health vault. This signature does not initiate a transaction or cost gas.'

export async function deriveEncryptionKey(address: string): Promise<CryptoKey> {
  const ethereum = (window as any).ethereum
  if (!ethereum) throw new Error('MetaMask not found')

  const signature: string = await ethereum.request({
    method: 'personal_sign',
    params: [ENCRYPTION_MESSAGE, address],
  })

  const sigBytes = hexToBytes(signature)
  const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer)

  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPayload<T>(key: CryptoKey, data: T): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  )

  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)

  return btoa(String.fromCharCode(...combined))
}

export async function decryptPayload<T>(key: CryptoKey, encoded: string): Promise<T> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
