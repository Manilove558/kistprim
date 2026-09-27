import { NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

export const dynamic = 'force-dynamic'

/**
 * Photo par like / unlike — students bina login ke kar sakte hain.
 * Ek tap = +1, dobara tap = -1 (unlike). Count sabko dikhta hai.
 * (Ek device se ek photo par ek hi active like — browser localStorage me yaad rakhta hai.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const src = body?.src
    if (!src || typeof src !== 'string' || src.length > 500) {
      return NextResponse.json({ ok: false, error: 'Galat request' }, { status: 400 })
    }
    const store = getStore('solasta-gallery')
    const likes = ((await store.get('likes.json', { type: 'json' }).catch(() => null)) || {}) as Record<string, number>
    if (body?.action === 'unlike') {
      likes[src] = Math.max(0, (likes[src] || 0) - 1)
    } else {
      likes[src] = (likes[src] || 0) + 1
    }
    await store.setJSON('likes.json', likes)
    return NextResponse.json({ ok: true, likes: likes[src] })
  } catch {
    return NextResponse.json({ ok: false, error: 'Like save nahi ho paya' }, { status: 500 })
  }
}
