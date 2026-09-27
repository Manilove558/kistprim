import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import { ADMIN_EMAIL } from '@/lib/admin-auth'

// Ye route hamesha dynamic rahe — static prerender mat karo
export const dynamic = 'force-dynamic'

const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minute
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 minute me 1 OTP (spam se bachao)

// POST /api/send-otp  { email }
// OTP SERVER par banta hai aur Netlify Blobs me store hota hai (5 min valid).
// Verify /api/verify-otp par hota hai — browser me OTP kabhi nahi banta.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Sirf admin email se login ho sakta hai' }, { status: 403 })
    }

    const store = getStore('solasta-gallery')

    // Rate limit: 1 minute me 1 OTP — inbox spam se bachao
    const meta = (await store.get('otp-meta.json', { type: 'json' }).catch(() => null)) as {
      lastSentAt?: number
    } | null
    if (meta?.lastSentAt && Date.now() - meta.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - meta.lastSentAt)) / 1000)
      return NextResponse.json({ error: `Thoda ruk kar phir try karein (${waitSec}s)` }, { status: 429 })
    }

    // OTP server par banao aur store karo
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await store.setJSON('otp.json', { otp, expires: Date.now() + OTP_EXPIRY_MS })
    await store.setJSON('otp-meta.json', { lastSentAt: Date.now() })

    const resendKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL

    // Agar Resend API key hai to asli email bhejo
    if (resendKey) {
      if (!fromEmail) {
        return NextResponse.json({ error: 'RESEND_FROM_EMAIL env var set nahi hai' }, { status: 500 })
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
          subject: 'Aapka Admin Login OTP — Solasta Gallery',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="margin:0 0 8px;">Solasta Gallery — Admin OTP</h2>
              <p style="color:#555;">Aapka login OTP hai:</p>
              <p style="font-size:32px; font-weight:800; letter-spacing:6px; margin:16px 0;">${otp}</p>
              <p style="color:#888; font-size:13px;">Ye OTP 5 minute ke liye valid hai. Agar aapne request nahi ki to ignore karein.</p>
            </div>
          `,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('Resend error:', err)
        return NextResponse.json({ error: 'Email bhejne me problem hui' }, { status: 500 })
      }

      return NextResponse.json({ ok: true, sent: true })
    }

    // Dev / bina key ke: OTP console me log karo aur preview ke liye wapas bhejo
    // Production me RESEND_API_KEY lagana zaroori hai taaki mail sach me jaye.
    // (Dev me bhi OTP server par store hota hai — verify /api/verify-otp par hoga.)
    console.log(`[DEV] Admin OTP for ${ADMIN_EMAIL}: ${otp}`)
    return NextResponse.json({
      ok: true,
      sent: false,
      devPreviewOtp: otp,
      message: 'RESEND_API_KEY nahi mili — dev mode me OTP preview me bheja gaya hai',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
