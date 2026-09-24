import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { GalleryImage } from '@/lib/gallery-data'

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
    return NextResponse.json({
      custom: (custom as GalleryImage[] | null) || [],
      deleted: (deleted as string[] | null) || [],
    })
  } catch (e) {
    // Local dev ya Blobs configure nahi — client localStorage fallback use karega
    return NextResponse.json({ custom: [], deleted: [], fallback: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, image, src } = body as {
      action: 'add' | 'delete'
      image?: GalleryImage
      src?: string
    }

    const store = getGalleryStore()
    let custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) as GalleryImage[] | null) || []
    let deleted = ((await store.get('deleted.json', { type: 'json' }).catch(() => null)) as string[] | null) || []

    if (action === 'add' && image) {
      // Duplicate se bachao
      if (!custom.some((c) => c.src === image.src)) {
        custom.unshift(image)
        await store.setJSON('custom.json', custom)
      }
    } else if (action === 'delete' && src) {
      // Custom photo hai to list se hatao
      const beforeLen = custom.length
      custom = custom.filter((c) => c.src !== src)
      if (custom.length !== beforeLen) {
        await store.setJSON('custom.json', custom)
      }
      // Initial photo hai (data: nahi) to deleted list me dalo taaki wapas na aye
      if (!src.startsWith('data:')) {
        if (!deleted.includes(src)) {
          deleted.push(src)
          await store.setJSON('deleted.json', deleted)
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, custom, deleted })
  } catch (e) {
    console.error('Gallery API error:', e)
    return NextResponse.json(
      { error: 'Storage me problem hui — kya site Netlify par deploy hai?' },
      { status: 500 }
    )
  }
}
