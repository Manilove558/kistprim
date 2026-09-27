import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import { getOtpStore } from '@/lib/otp-store'

// Always keep this route dynamic — no static prerender
export const dynamic = 'force-dynamic'

const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minute
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 minute me 1 OTP (spam se bachao)

// POST /api/send-otp  { email }
// The OTP is generated on the SERVER and stored in Netlify Blobs (valid 5 min).
// Verification happens at /api/verify-otp — the OTP is never generated in the browser.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Only the admin email can log in' }, { status: 403 })
    }

    const store = getOtpStore()

    // Rate limit: 1 OTP per minute — protects against inbox spam
    const meta = (await store.get('otp-meta.json', { type: 'json' }).catch(() => null)) as {
      lastSentAt?: number
    } | null
    if (meta?.lastSentAt && Date.now() - meta.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - meta.lastSentAt)) / 1000)
      return NextResponse.json({ error: `Please wait a moment and try again (${waitSec}s)` }, { status: 429 })
    }

    // Generate and store the OTP on the server
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await store.setJSON('otp.json', { otp, expires: Date.now() + OTP_EXPIRY_MS })
    await store.setJSON('otp-meta.json', { lastSentAt: Date.now() })

    const resendKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL

    // If a Resend API key exists, send a real email
    if (resendKey) {
      if (!fromEmail) {
        return NextResponse.json({ error: 'RESEND_FROM_EMAIL env var is not set' }, { status: 500 })
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Solasta Admin <${fromEmail}>`,
          to: [ADMIN_EMAIL],
          subject: 'Your Admin Login OTP — Solasta Gallery',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="margin:0 0 8px;">Solasta Gallery — Admin OTP</h2>
              <p style="color:#555;">Your login OTP is:</p>
              <p style="font-size:32px; font-weight:800; letter-spacing:6px; margin:16px 0;">${otp}</p>
              <p style="color:#888; font-size:13px;">This OTP is valid for 5 minutes. If you did not request it, please ignore this email.</p>
            </div>
          `,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('Resend error:', err)
        return NextResponse.json({ error: 'Could not send the email' }, { status: 500 })
      }

      return NextResponse.json({ ok: true, sent: true })
    }

    // Dev / without a key: log the OTP to the console and return it for preview
    // RESEND_API_KEY is required in production so the mail is actually sent.
    // (In dev the OTP is also stored on the server — verify at /api/verify-otp.)
    console.log(`[DEV] Admin OTP for ${ADMIN_EMAIL}: ${otp}`)
    return NextResponse.json({
      ok: true,
      sent: false,
      devPreviewOtp: otp,
      message: 'RESEND_API_KEY not found — OTP sent in preview (dev mode)',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
