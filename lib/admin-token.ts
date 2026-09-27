import { createHmac, timingSafeEqual } from 'crypto'
import { ADMIN_EMAIL } from './admin-auth'

// SERVER ONLY — is file ko kabhi client component me import mat karna
// (crypto Node ka module hai, browser me nahi chalega)

const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000 // 12 ghante

function getSecret(): string {
  const s = process.env.ADMIN_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SECRET env var set nahi hai — Netlify me add karo')
    }
    console.warn('[admin-token] ADMIN_SECRET nahi hai — sirf local dev ke liye insecure secret use ho raha hai')
    return 'dev-only-insecure-secret'
  }
  return s
}

function b64urlEncode(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64url')
}

function b64urlDecode(b: string): string {
  return Buffer.from(b, 'base64url').toString('utf8')
}

// Admin ke liye signed token banao: payload.signature
export function signAdminToken(): string {
  const payload = b64urlEncode(JSON.stringify({ email: ADMIN_EMAIL, exp: Date.now() + TOKEN_EXPIRY_MS }))
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

// Token sahi hai? (signature + expiry + email check)
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  let expected: string
  try {
    expected = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  } catch {
    return false
  }
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || a.length === 0) return false
  if (!timingSafeEqual(a, b)) return false
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { email?: string; exp?: number }
    return data.email === ADMIN_EMAIL && typeof data.exp === 'number' && Date.now() < data.exp
  } catch {
    return false
  }
}

// Request ke Authorization header se token nikalo
export function getTokenFromRequest(req: Request): string | null {
  const h = req.headers.get('authorization')
  if (h && h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  return null
}
