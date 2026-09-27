import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import JSZip from 'jszip'
import type { GalleryImage, GalleryEdits } from '@/lib/gallery-data'
import { verifyAdminToken, getTokenFromRequest } from '@/lib/admin-token'

export const dynamic = 'force-dynamic'

/**
 * 🔒 Admin-only: saari uploaded photos + gallery metadata ka ZIP backup.
 * "Photos hamesha rahenge na" ka jawab — haan, aur is backup se
 * tumhare paas hamesha ek copy bhi rahegi.
 */
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(getTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: 'Admin login required' }, { status: 403 })
  }

  try {
    const store = getStore('solasta-gallery')
    const [custom, albums, likes, edits] = await Promise.all([
      store.get('custom.json', { type: 'json' }).catch(() => null),
      store.get('albums.json', { type: 'json' }).catch(() => null),
      store.get('likes.json', { type: 'json' }).catch(() => null),
      store.get('edits.json', { type: 'json' }).catch(() => null),
    ])
    const photos = ((custom || []) as GalleryImage[]).filter((img) => img.src.startsWith('/api/photo/'))

    const zip = new JSZip()
    const folder = zip.folder('photos')

    for (const img of photos) {
      const blobKey = decodeURIComponent(img.src.slice('/api/photo/'.length))
      if (!blobKey.startsWith('photos/')) continue
      const data = await store.get(blobKey, { type: 'arrayBuffer' }).catch(() => null)
      if (data && folder) {
        folder.file(blobKey.slice('photos/'.length), data)
      }
    }

    zip.file(
      'gallery.json',
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          site: 'Solasta Gallery backup',
          albums: albums || [],
          likes: likes || {},
          edits: (edits || {}) as GalleryEdits,
          photos: photos.map((img) => ({
            file: img.src.startsWith('/api/photo/') ? img.src.slice('/api/photo/photos/'.length) : img.src,
            title: img.title,
            detail: img.detail,
            album: img.album || '',
          })),
        },
        null,
        2,
      ),
    )
    zip.file(
      'README.txt',
      'Solasta Gallery — photo backup\n\n' +
        'photos/ folder me saari uploaded photos hain (original quality).\n' +
        'gallery.json me har photo ka title, detail aur album hai.\n' +
        'Ye backup apne laptop/phone me sambhal kar rakho.\n',
    )

    const buf = await zip.generateAsync({ type: 'uint8array' })
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="solasta-backup-${date}.zip"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the backup'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
