// Admin auth — CLIENT-SAFE helpers (they run in the browser)
// Real OTP verification and token signing happen on the SERVER (lib/admin-token.ts).
// Only helpers to save / check the token here — no secrets.

export const ADMIN_EMAIL = 'backc6915@gmail.com'

const TOKEN_KEY = 'kist_admin_token'

export function saveAdminToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    // Clear old client-side session keys (no longer used)
    localStorage.removeItem('kist_admin_session')
    localStorage.removeItem('kist_admin_otp')
  } catch {}
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('kist_admin_session')
    localStorage.removeItem('kist_is_admin')
    localStorage.removeItem('kist_admin_otp')
  } catch {}
}

// Decode the token payload (no signature verification — the server does that)
function parseTokenPayload(token: string): { email?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[0]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Is the admin logged in? (token present + not expired + email correct)
export function isAdminLoggedIn(): boolean {
  const token = getAdminToken()
  if (!token) return false
  const data = parseTokenPayload(token)
  return !!data && data.email === ADMIN_EMAIL && typeof data.exp === 'number' && Date.now() < data.exp
}

export function isValidAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL
}

// Gallery API calls ke liye Authorization header
export function authHeaders(): Record<string, string> {
  const token = getAdminToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
