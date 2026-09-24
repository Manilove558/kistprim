import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

// Ye route hamesha dynamic rahe — static prerender mat karo
export const dynamic = 'force-dynamic'

function getGalleryStore() {
  return getStore('solasta-gallery')
}

// Uploaded photo ko blob storage se nikaal kar browser ko do.
// URL jaisa: /api/photo/photos/abc123.jpg
// Sirf photos/ wali keys allowed hain (security).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params
    const blobKey = (key || []).join('/')
    if (!blobKey || !blobKey.startsWith('photos/') || blobKey.includes('..')) {
      return new NextResponse('Not found', { status: 404 })
    }
    const store = getGalleryStore()
    const blob = await store.get(blobKey, { type: 'blob' })
    if (!blob) {
      return new NextResponse('Not found', { status: 404 })
    }
    return new NextResponse(blob, {
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
        // Browser photo ko cache kar le — dobara download nahi hogi
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    console.error('Photo serve error:', e)
    return new NextResponse('Error', { status: 500 })
  }
}
