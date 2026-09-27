import { NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

export const dynamic = 'force-dynamic'

/**
 * Like / unlike a photo — students can do it without logging in.
 * One tap = +1, tap again = -1 (unlike). The count is visible to everyone.
 * (One active like per photo per device — remembered in browser localStorage.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const src = body?.src
    if (!src || typeof src !== 'string' || src.length > 500) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
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
    return NextResponse.json({ ok: false, error: 'Could not save the like' }, { status: 500 })
  }
}
