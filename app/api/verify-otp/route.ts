import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import { signAdminToken } from '@/lib/admin-token'

// Ye route hamesha dynamic rahe — static prerender mat karo
export const dynamic = 'force-dynamic'

// POST /api/verify-otp  { email, otp }
// OTP ko server par store kiye gaye OTP se milao.
// Sahi hua to signed admin token do (12 ghante valid) — isi token se
// /api/gallery par photo add/delete/edit hoga.
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Sirf admin email se login ho sakta hai' }, { status: 403 })
    }
    if (!otp || String(otp).trim().length !== 6) {
      return NextResponse.json({ error: '6-digit OTP daalein' }, { status: 400 })
    }

    const store = getStore('solasta-gallery')
    const stored = (await store.get('otp.json', { type: 'json' }).catch(() => null)) as {
      otp?: string
      expires?: number
    } | null

    if (!stored?.otp || Date.now() > (stored.expires || 0)) {
      return NextResponse.json({ error: 'OTP expire ho gaya hai. Dobara bhejein.' }, { status: 400 })
    }
    if (String(otp).trim() !== stored.otp) {
      return NextResponse.json({ error: 'Galat OTP. Dobara try karein.' }, { status: 400 })
    }

    // OTP single-use hai — verify hote hi khatam
    await store.delete('otp.json').catch(() => {})

    // Signed admin token banao (ADMIN_SECRET missing hua to production me 500 ayega)
    const token = signAdminToken()
    return NextResponse.json({ ok: true, token })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
