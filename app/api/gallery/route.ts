import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import type { GalleryImage, GalleryEdits } from '@/lib/gallery-data'
import { verifyAdminToken, getTokenFromRequest } from '@/lib/admin-token'

// Always keep this route dynamic — no static prerender
export const dynamic = 'force-dynamic'

// Shared gallery storage — Netlify Blobs so all devices show the same
// localStorage is only a fallback (when Blobs is unavailable)

function getGalleryStore() {
  // In Netlify Functions/Edge the siteID/token are auto-set
  // In local dev this throws -> the fallback is used
  return getStore('solasta-gallery')
}

/**
 * Store a base64 photo from the browser as a separate blob file and
 * point the image src at that blob via its /api/photo/... link.
 * (This is what makes lazy loading work.)
 */
async function storeImageBlob(store: ReturnType<typeof getGalleryStore>, image: GalleryImage): Promise<GalleryImage> {
  if (!image.src.startsWith('data:')) return image
  const match = image.src.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/)
  if (!match) return image
  const mimeType = match[1]
  const base64 = match[2]
  // ~6MB raw limit (~8MB in base64) — server-side safety check
  if (base64.length > 8 * 1024 * 1024) throw new Error('Photo is too large (max 5MB)')
  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg').split('+')[0] || 'jpg'
  const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const blobKey = `photos/${uniqueId}.${ext}`
  const bytes = Buffer.from(base64, 'base64')
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  // Keep the type in the blob so /api/photo can send the right Content-Type
  await store.set(blobKey, new Blob([ab], { type: mimeType }))
  return { ...image, src: `/api/photo/${blobKey}` }
}

function cleanAlbumName(name: unknown): string {
  if (typeof name !== 'string') return ''
  return name.trim().slice(0, 40)
}

/** Register an album in albums.json (no duplicates), return the updated list. */
async function registerAlbum(store: ReturnType<typeof getGalleryStore>, name: string): Promise<string[]> {
  const albums = ((await store.get('albums.json', { type: 'json' }).catch(() => null)) || []) as string[]
  if (!albums.includes(name)) {
    albums.push(name)
    await store.setJSON('albums.json', albums)
  }
  return albums
}

/**
 * Which albums still have photos — uploaded (custom.json) + bundled (edits.json).
 * (A delete removes the entry from both places, so remaining entries
 * mean the photo is still visible in the gallery.)
 */
function getUsedAlbums(custom: GalleryImage[], edits: GalleryEdits): Set<string> {
  const used = new Set<string>()
  for (const img of custom) {
    const a = (img.album || '').trim()
    if (a) used.add(a)
  }
  for (const key of Object.keys(edits)) {
    const a = (edits[key]?.album || '').trim()
    if (a) used.add(a)
  }
  return used
}

/**
 * Remove albums (categories) with no photos left from albums.json.
 */
async function pruneEmptyAlbums(store: ReturnType<typeof getGalleryStore>): Promise<void> {
  const [custom, edits, albums] = await Promise.all([
    ((await store.get('custom.json', { type: 'json' }).catch(() => null)) || []) as GalleryImage[],
    (((await store.get('edits.json', { type: 'json' }).catch(() => null)) || {}) as GalleryEdits),
    (((await store.get('albums.json', { type: 'json' }).catch(() => null)) || []) as string[]),
  ])
  const used = getUsedAlbums(custom, edits)
  const kept = albums.filter((a) => used.has(a))
  if (kept.length !== albums.length) {
    await store.setJSON('albums.json', kept)
  }
}

export async function GET() {
  try {
    const store = getGalleryStore()
    const [custom, deleted, edits, albums, likes] = await Promise.all([
      store.get('custom.json', { type: 'json' }).catch(() => null),
      store.get('deleted.json', { type: 'json' }).catch(() => null),
      store.get('edits.json', { type: 'json' }).catch(() => null),
      store.get('albums.json', { type: 'json' }).catch(() => null),
      store.get('likes.json', { type: 'json' }).catch(() => null),
    ])
    // Also clean up already-empty categories — so an old empty
    // category removes itself the next time the page opens (no need to wait for a delete)
    const customList = (custom || []) as GalleryImage[]
    const editsObj = (edits || {}) as GalleryEdits
    let albumList = (albums || []) as string[]
    const used = getUsedAlbums(customList, editsObj)
    const keptAlbums = albumList.filter((a) => used.has(a))
    if (keptAlbums.length !== albumList.length) {
      albumList = keptAlbums
      await store.setJSON('albums.json', keptAlbums).catch(() => {})
    }
    return NextResponse.json({
      custom: customList,
      deleted: deleted || [],
      edits: editsObj,
      albums: albumList,
      likes: likes || {},
    })
  } catch {
    // If the server is down, the client uses the localStorage fallback
    return NextResponse.json({ custom: [], deleted: [], edits: {}, albums: [], likes: {}, fallback: true })
  }
}

export async function POST(req: NextRequest) {
  // 🔒 Only valid admin tokens can add/edit/delete/album
  if (!verifyAdminToken(getTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: 'Admin login required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const store = getGalleryStore()

  try {
    // ---------- ADD (single photo) ----------
    if (body.action === 'add' && body.image) {
      const image = (await storeImageBlob(store, body.image as GalleryImage)) as GalleryImage
      const custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) || []) as GalleryImage[]
      const next = [image, ...custom.filter((img) => img.src !== image.src)]
      await store.setJSON('custom.json', next)
      const album = cleanAlbumName(image.album)
      if (album) await registerAlbum(store, album)
      return NextResponse.json({ ok: true, custom: next })
    }

    // ---------- ADD MANY (bulk upload — ek baar me max 50) ----------
    if (body.action === 'addMany' && Array.isArray(body.images)) {
      const incoming = (body.images as GalleryImage[]).slice(0, 50)
      const processed: GalleryImage[] = []
      for (const raw of incoming) {
        if (!raw || typeof raw.src !== 'string') continue
        processed.push(await storeImageBlob(store, raw))
      }
      const custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) || []) as GalleryImage[]
      const seen = new Set(processed.map((p) => p.src))
      const next = [...processed, ...custom.filter((img) => !seen.has(img.src))]
      await store.setJSON('custom.json', next)
      let albums: string[] = []
      for (const p of processed) {
        const album = cleanAlbumName(p.album)
        if (album) albums = await registerAlbum(store, album)
      }
      return NextResponse.json({ ok: true, custom: next, added: processed.length, albums })
    }

    // ---------- DELETE ----------
    if (body.action === 'delete' && body.src) {
      const custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) || []) as GalleryImage[]
      const target = custom.find((img) => img.src === body.src)

      if (target) {
        // Uploaded photo: remove from custom.json + delete the blob file too
        if (target.src.startsWith('/api/photo/')) {
          const blobKey = decodeURIComponent(target.src.slice('/api/photo/'.length))
          if (blobKey.startsWith('photos/')) {
            await store.delete(blobKey).catch(() => {})
          }
        }
        const next = custom.filter((img) => img.src !== body.src)
        await store.setJSON('custom.json', next)
      } else {
        // Bundled photo (/photos/* lives in the repo) — add to the deleted.json hide-list
        const deleted = ((await store.get('deleted.json', { type: 'json' }).catch(() => null)) || []) as string[]
        if (!deleted.includes(body.src)) {
          deleted.push(body.src)
          await store.setJSON('deleted.json', deleted)
        }
      }

      // Also clear this photo's likes
      const likes = ((await store.get('likes.json', { type: 'json' }).catch(() => null)) || {}) as Record<string, number>
      if (likes[body.src] !== undefined) {
        delete likes[body.src]
        await store.setJSON('likes.json', likes)
      }
      // Also remove the stale caption-edit entry
      const edits = ((await store.get('edits.json', { type: 'json' }).catch(() => null)) || {}) as GalleryEdits
      if (edits[body.src]) {
        delete edits[body.src]
        await store.setJSON('edits.json', edits)
      }
      // Remove the category option that has no photos left
      await pruneEmptyAlbums(store)
      const albums = ((await store.get('albums.json', { type: 'json' }).catch(() => null)) || []) as string[]
      return NextResponse.json({ ok: true, albums })
    }

    // ---------- EDIT (caption + album) ----------
    if (body.action === 'edit' && body.src) {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
      const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 500) : ''
      const album = cleanAlbumName(body.album)
      const custom = ((await store.get('custom.json', { type: 'json' }).catch(() => null)) || []) as GalleryImage[]
      const next = custom.map((img) =>
        img.src === body.src
          ? { ...img, title, detail, ...(body.album !== undefined ? { album: album || undefined } : {}) }
          : img,
      )
      await store.setJSON('custom.json', next)
      // Also save caption edits to edits.json so all devices show the same
      // (bundled photos get their album from here too)
      const edits = ((await store.get('edits.json', { type: 'json' }).catch(() => null)) || {}) as GalleryEdits
      edits[body.src] = { title, detail, ...(body.album !== undefined ? { album } : {}) }
      await store.setJSON('edits.json', edits)
      if (album) await registerAlbum(store, album)
      // If an album was removed/changed, clean up the empty category
      await pruneEmptyAlbums(store)
      const albums = ((await store.get('albums.json', { type: 'json' }).catch(() => null)) || []) as string[]
      return NextResponse.json({ ok: true, custom: next, albums })
    }

    // ---------- ALBUM CREATE ----------
    if (body.action === 'album-create' && body.name) {
      const name = cleanAlbumName(body.name)
      if (!name) return NextResponse.json({ ok: false, error: 'Album name is empty' }, { status: 400 })
      const albums = await registerAlbum(store, name)
      return NextResponse.json({ ok: true, albums })
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
