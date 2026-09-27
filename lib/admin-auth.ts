// Admin auth — CLIENT-SAFE helpers (browser me chalte hain)
// Asli OTP verification aur token signing SERVER par hoti hai (lib/admin-token.ts).
// Yahan sirf token ko save / check karne ke helpers hain — koi secret yahan nahi.

export const ADMIN_EMAIL = 'backc6915@gmail.com'

const TOKEN_KEY = 'kist_admin_token'

export function saveAdminToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    // Purane client-side session keys saaf karo (ab kaam ke nahi)
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

// Token ke payload ko decode karo (signature verify nahi — wo server karta hai)
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

// Admin logged in hai? (token maujood + expire nahi hua + email sahi)
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
