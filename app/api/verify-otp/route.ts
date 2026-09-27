import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import { signAdminToken } from '@/lib/admin-token'
import { getOtpStore } from '@/lib/otp-store'

// Always keep this route dynamic — no static prerender
export const dynamic = 'force-dynamic'

// POST /api/verify-otp  { email, otp }
// Compare the OTP with the one stored on the server.
// On success, return a signed admin token (valid 12 hours) — this token
// authorizes photo add/delete/edit on /api/gallery.
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Only the admin email can log in' }, { status: 403 })
    }
    if (!otp || String(otp).trim().length !== 6) {
      return NextResponse.json({ error: 'Enter the 6-digit OTP' }, { status: 400 })
    }

    const store = getOtpStore()
    const stored = (await store.get('otp.json', { type: 'json' }).catch(() => null)) as {
      otp?: string
      expires?: number
    } | null

    if (!stored?.otp || Date.now() > (stored.expires || 0)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }
    if (String(otp).trim() !== stored.otp) {
      return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 })
    }

    // The OTP is single-use — it expires as soon as it is verified
    await store.delete('otp.json').catch(() => {})

    // Create the signed admin token (missing ADMIN_SECRET causes a 500 in production)
    const token = signAdminToken()
    return NextResponse.json({ ok: true, token })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
