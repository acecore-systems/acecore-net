/**
 * パスワードハッシュユーティリティ
 *
 * Web Crypto API の PBKDF2 を使い、Cloudflare Workers で動作する
 * パスワードハッシュ・検証を提供する。
 *
 * 保存形式: `pbkdf2:sha256:<iterations>:<saltHex>:<hashHex>`
 * バージョン情報を含むことで、将来のパラメータ変更時も既存ハッシュを検証可能。
 */

/** 現在のデフォルトパラメータ */
const CURRENT_ITERATIONS = 100_000
const CURRENT_HASH_ALGORITHM = 'SHA-256'
const KEY_LENGTH = 256

/**
 * パスワードをハッシュ化する（パラメータ付き形式の文字列を返す）
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hashBuf = await deriveKey(
    password,
    salt,
    CURRENT_ITERATIONS,
    CURRENT_HASH_ALGORITHM,
  )
  const saltHex = bufToHex(salt)
  const hashHex = bufToHex(new Uint8Array(hashBuf))
  return `pbkdf2:sha256:${CURRENT_ITERATIONS}:${saltHex}:${hashHex}`
}

/**
 * パスワードを検証する（timing-safe 比較）
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const params = parseStoredHash(stored)
  if (!params) return false

  const hashBuf = await deriveKey(
    password,
    params.salt,
    params.iterations,
    params.algorithm,
  )
  return timingSafeEqual(new Uint8Array(hashBuf), params.hash)
}

/** 保存形式をパースし、パラメータを抽出する */
function parseStoredHash(stored: string): {
  iterations: number
  algorithm: string
  salt: Uint8Array
  hash: Uint8Array
} | null {
  const parts = stored.split(':')

  // 新形式: pbkdf2:sha256:<iterations>:<salt>:<hash>
  if (parts[0] === 'pbkdf2' && parts.length === 5) {
    const algorithmMap: Record<string, string> = { sha256: 'SHA-256' }
    const algorithm = algorithmMap[parts[1]!]
    if (!algorithm) return null
    const iterations = parseInt(parts[2]!, 10)
    if (isNaN(iterations) || iterations <= 0) return null
    return {
      iterations,
      algorithm,
      salt: hexToBuf(parts[3]!),
      hash: hexToBuf(parts[4]!),
    }
  }

  // レガシー形式: <salt>:<hash>（移行期間中の互換用）
  if (parts.length === 2) {
    return {
      iterations: CURRENT_ITERATIONS,
      algorithm: CURRENT_HASH_ALGORITHM,
      salt: hexToBuf(parts[0]!),
      hash: hexToBuf(parts[1]!),
    }
  }

  return null
}

/** PBKDF2 鍵導出 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: string,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash },
    key,
    KEY_LENGTH,
  )
}

/**
 * Timing-safe なバイト列比較
 *
 * 長さが異なる場合もダミー比較を行い、一定時間で結果を返す。
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    // 長さ不一致でもタイミングを揃えるためダミー比較
    const dummy = new Uint8Array(a.length)
    let d = 1
    for (let i = 0; i < a.length; i++) {
      d |= a[i]! ^ dummy[i]!
    }
    return false && d === 0 // 常に false だが最適化を防ぐ
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
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
