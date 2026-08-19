/**
 * Normalize private keys from .env / Railway (quotes, 0x, whitespace, BOM, etc.)
 */
export function normalizePrivateKey(raw, label = 'Private key') {
  if (raw == null || String(raw).trim() === '') {
    throw new Error(`${label} not set`)
  }

  let hex = String(raw).trim()
  hex = hex.replace(/^["']|["']$/g, '')
  hex = hex.replace(/^<|>$/g, '')
  hex = hex.replace(/[\u200B-\u200D\uFEFF]/g, '')
  hex = hex.replace(/\s+/g, '')

  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2)
  }

  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      `${label} must be hex only (got non-hex characters after cleanup). ` +
        'Paste the 64-character MetaMask export with no spaces or quotes.',
    )
  }

  if (hex.length !== 64) {
    throw new Error(
      `${label} must be 32-byte hex (64 characters, got ${hex.length} after cleanup). ` +
        'MetaMask shows 64 hex chars — remove 0x if doubling length, or check for truncation in Railway.',
    )
  }

  return `0x${hex.toLowerCase()}`
}

export function inspectPrivateKeyEnv(raw, label = 'Private key') {
  const trimmed = String(raw ?? '').trim()
  const result = {
    set: trimmed.length > 0,
    rawLength: trimmed.length,
    normalized: null,
    normalizedLength: 0,
    valid: false,
    error: null,
  }

  if (!result.set) {
    result.error = `${label} not set`
    return result
  }

  try {
    result.normalized = normalizePrivateKey(raw, label)
    result.normalizedLength = result.normalized.length
    result.valid = true
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }

  return result
}
