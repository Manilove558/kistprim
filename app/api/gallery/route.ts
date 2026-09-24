import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { GalleryImage, GalleryEdits } from '@/lib/gallery-data'

// Ye route hamesha dynamic rahe — static prerender mat karo
export const dynamic = 'force-dynamic'

// Shared gallery storage — Netlify Blobs par taaki sab devices par same dikhe
// localStorage sirf fallback hai (jab Blobs available nahi)

function getGalleryStore() {
  // Netlify Functions/Edge me siteID/token auto-set hote hain
  // Local dev me ye throw karega -> fallback use hoga
  return getStore('solasta-gallery')
}

export async function GET() {
  try {
    const store = getGalleryStore()
    const custom = await store.get('custom.json', { type: 'json' }).catch(() => null)
    const deleted = await store.get('deleted.json', { type: 'json' }).catch(() => null)
    const edits = await store.get('edits.json', { type: 'json' }).catch(() => null)
    return NextResponse.json({
      custom: (custom as GalleryImage[] | null) || [],
      deleted: (deleted as string[] | null) || [],
      edits: (edits as GalleryEdits | null) || {},
    })
  } catch (e) {
    // Local dev ya Blobs configure nahi — client localStorage fallback use karega
    return NextResponse.json({ custom: [], deleted: [], edits: {}, fallback: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, image, src, title, detail } = body as {
      action: 'add' | 'delete' | 'edit'
      image?: GalleryImage
      src?: string
      title?: string
      detail?: string
    }

    const store = getGalleryStore()
    let custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) as GalleryImage[] | null) || []
    let deleted = ((await store.get('deleted.json', { type: 'json' }).catch(() => null)) as string[] | null) || []
    const edits = ((await store.get('edits.json', { type: 'json' }).catch(() => null)) as GalleryEdits | null) || {}

    if (action === 'add' && image) {
      let finalImage = image
      // Base64 photo ko alag blob file me save karo — taaki browser use lazy-load
      // kar sake (poori gallery JSON me ghusa hone se page slow hota hai)
      if (image.src.startsWith('data:')) {
        const match = image.src.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/)
        if (match) {
          const mimeType = match[1]
          const base64 = match[2]
          const ext = mimeType.split('/')[1].replace('jpeg', 'jpg').split('+')[0] || 'jpg'
          const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          const blobKey = `photos/${uniqueId}.${ext}`
          const buffer = Buffer.from(base64, 'base64')
          await store.set(blobKey, buffer, { contentType: mimeType })
          // JSON me sirf photo ka link rakho, poori photo nahi
          finalImage = { ...image, src: `/api/photo/${blobKey}` }
        }
      }
      // Duplicate se bachao
      if (!custom.some((c) => c.src === finalImage.src)) {
        custom.unshift(finalImage)
        await store.setJSON('custom.json', custom)
      }
    } else if (action === 'delete' && src) {
      // Custom photo hai to list se hatao
      const beforeLen = custom.length
      custom = custom.filter((c) => c.src !== src)
      if (custom.length !== beforeLen) {
        await store.setJSON('custom.json', custom)
      }
      // Agar ye uploaded blob photo hai to uski file bhi delete karo (storage saaf rahe)
      if (src.startsWith('/api/photo/')) {
        const blobKey = decodeURIComponent(src.slice('/api/photo/'.length))
        if (blobKey.startsWith('photos/')) {
          await store.delete(blobKey).catch(() => {})
        }
      }
      // Purani bundled photo hai (/photos/...) to deleted list me dalo taaki wapas na aye
      if (src.startsWith('/photos/')) {
        if (!deleted.includes(src)) {
          deleted.push(src)
          await store.setJSON('deleted.json', deleted)
        }
      }
    } else if (action === 'edit' && src) {
      // Admin ne caption edit kiya — src ke hisaab se title/detail save karo
      const t = (title || '').trim()
      const d = (detail || '').trim()
      if (!t) {
        return NextResponse.json({ error: 'Title khaali nahi ho sakta' }, { status: 400 })
      }
      edits[src] = { title: t, detail: d }
      await store.setJSON('edits.json', edits)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, custom, deleted, edits })
  } catch (e) {
    console.error('Gallery API error:', e)
    return NextResponse.json(
      { error: 'Storage me problem hui — kya site Netlify par deploy hai?' },
      { status: 500 }
    )
  }
}
