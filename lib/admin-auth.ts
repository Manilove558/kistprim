// Admin auth constants aur helpers
// Sirf yahi email admin hai — user ki requirement ke hisab se
export const ADMIN_EMAIL = 'backc6915@gmail.com'

const SESSION_KEY = 'kist_admin_session'
const OTP_KEY = 'kist_admin_otp'
const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minute

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function saveOtp(otp: string) {
  try {
    localStorage.setItem(OTP_KEY, JSON.stringify({ otp, expires: Date.now() + OTP_EXPIRY_MS }))
  } catch {}
}

export function getStoredOtp(): { otp: string; expires: number } | null {
  try {
    const raw = localStorage.getItem(OTP_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearOtp() {
  try { localStorage.removeItem(OTP_KEY) } catch {}
}

export function verifyOtp(input: string): boolean {
  const stored = getStoredOtp()
  if (!stored) return false
  if (Date.now() > stored.expires) {
    clearOtp()
    return false
  }
  return stored.otp === input.trim()
}

export function setAdminSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: ADMIN_EMAIL, loginAt: Date.now() }))
    localStorage.setItem('kist_is_admin', '1')
  } catch {}
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('kist_is_admin')
  } catch {}
}

export function isAdminLoggedIn(): boolean {
  try {
    const s = localStorage.getItem(SESSION_KEY)
    if (!s) return false
    const data = JSON.parse(s)
    return data.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

export function isValidAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL
}
