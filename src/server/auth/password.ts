/**
 * パスワードハッシュユーティリティ
 *
 * Web Crypto API の PBKDF2 を使い、Cloudflare Workers で動作する
 * パスワードハッシュ・検証を提供する。
 */

const ITERATIONS = 100_000
const HASH_ALGORITHM = 'SHA-256'
const KEY_LENGTH = 256

/**
 * パスワードをハッシュ化する（salt:hash 形式の文字列を返す）
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGORITHM },
    key,
    KEY_LENGTH,
  )
  const saltHex = bufToHex(salt)
  const hashHex = bufToHex(new Uint8Array(hash))
  return `${saltHex}:${hashHex}`
}

/**
 * パスワードを検証する
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = hexToBuf(saltHex)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGORITHM },
    key,
    KEY_LENGTH,
  )
  return bufToHex(new Uint8Array(hash)) === hashHex
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []
  return new Uint8Array(bytes)
}
