'use client'

import { useRef, useState } from 'react'
import { X, Upload, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import type { GalleryImage } from '@/lib/gallery-data'

type Picked = {
  file: File
  preview: string
  title: string
}

type Props = {
  albums: string[]
  onClose: () => void
  onAddMany: (images: GalleryImage[]) => Promise<boolean>
}

const MAX_MB = 25

function fileTitle(name: string): string {
  const base = name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]+/g, ' ').trim()
  return base || 'Photo'
}

/* Photo ko upload se pehle chhota karo — 1920px max, JPEG.
   5MB ki photo ~400KB ki ho jati hai = upload 10x tez. */
async function compressImage(file: File): Promise<Blob> {
  const MAX_EDGE = 1920
  const QUALITY = 0.82
  let source: CanvasImageSource
  let sw: number
  let sh: number
  let closeBmp: (() => void) | undefined
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    source = bmp; sw = bmp.width; sh = bmp.height
    closeBmp = () => bmp.close()
  } catch {
    // Purane browser ke liye fallback
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('photo load nahi hui'))
        el.src = url
      })
      source = img; sw = img.naturalWidth; sh = img.naturalHeight
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh))
    const w = Math.max(1, Math.round(sw * scale))
    const h = Math.max(1, Math.round(sh * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas nahi bana')
    ctx.drawImage(source, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('compress nahi hua')
    return blob
  } finally {
    closeBmp?.()
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function AdminUpload({ albums, onClose, onAddMany }: Props) {
  const [picked, setPicked] = useState<Picked[]>([])
  const [album, setAlbum] = useState('')
  const [detail, setDetail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    setError('')
    const next: Picked[] = [...picked]
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" bahut badi hai (max ${MAX_MB}MB)`)
        continue
      }
      const preview = URL.createObjectURL(file)
      next.push({ file, preview, title: fileTitle(file.name) })
      if (next.length >= 50) break
    }
    setPicked(next)
  }

  const removeAt = (i: number) => {
    setPicked((prev) => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  const updateTitle = (i: number, title: string) => {
    setPicked((prev) => prev.map((p, idx) => (idx === i ? { ...p, title } : p)))
  }

  const handleUpload = async () => {
    setError('')
    setProgress('')
    if (picked.length === 0) { setError('Pehle photos chunein'); return }
    const files = [...picked]
    const albumName = album.trim()
    const commonDetail = detail.trim()
    setUploading(true)

    // Upload ke dauraan page band/refresh karne par warning do
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', guard)

    const okIndices = new Set<number>()
    let failed = 0
    try {
      // Ek-ek karke upload — jo ho gayi wo server par safe,
      // beech me page refresh ho to bhi dobara nahi karni padegi
      for (let i = 0; i < files.length; i++) {
        const p = files[i]
        try {
          setProgress(`Photo ${i + 1}/${files.length} taiyaar ho rahi hai…`)
          const small = await compressImage(p.file)
          const dataUrl = await blobToDataUrl(small)
          const title = p.title.trim() || `Photo ${i + 1}`
          setProgress(`Photo ${i + 1}/${files.length} upload ho rahi hai…`)
          const saved = await onAddMany([{
            title,
            detail: commonDetail,
            alt: title,
            src: dataUrl,
            width: 4,
            height: 4,
            ...(albumName ? { album: albumName } : {}),
          } as GalleryImage])
          if (!saved) throw new Error('server save fail')
          okIndices.add(i)
          URL.revokeObjectURL(p.preview)
        } catch {
          failed++
        }
      }
    } finally {
      window.removeEventListener('beforeunload', guard)
    }

    setUploading(false)
    setProgress('')
    if (okIndices.size > 0) {
      // Jo upload ho gayi unhe list se hatao taaki dobara na jayein
      setPicked((prev) => prev.filter((_, idx) => !okIndices.has(idx)))
    }
    if (failed > 0) {
      setError(`${okIndices.size} photo upload ho gayi, ${failed} reh gayi — dobara try karein`)
    } else {
      onClose()
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Photos post karein">
        <button className="admin-close" onClick={onClose} aria-label="Band karein"><X size={18} /></button>
        <div className="admin-head">
          <span className="admin-icon"><ImagePlus size={22} /></span>
          <h3>Photos Post karein</h3>
          <p>Ek saath kayi photos chun sakte ho (max 50)</p>
        </div>
        <div className="admin-body">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button className="admin-btn admin-btn-soft" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImagePlus size={16} /> Photos chunein{picked.length > 0 ? ` (${picked.length})` : ''}
          </button>

          {picked.length > 0 && (
            <div className="bulk-grid">
              {picked.map((p, i) => (
                <div key={`${p.preview}`} className="bulk-item">
                  <img src={p.preview} alt="" className="bulk-thumb" />
                  <input
                    value={p.title}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    className="bulk-title"
                    maxLength={80}
                    placeholder="Title"
                    aria-label={`Photo ${i + 1} ka title`}
                  />
                  <button className="bulk-remove" onClick={() => removeAt(i)} aria-label="Hatayein" title="Hatayein">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="admin-label">Detail (sab photos par same lagega, optional)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="admin-textarea"
            rows={2}
            maxLength={500}
            placeholder="Event ke baare me ek line"
          />

          <label className="admin-label">Album (optional)</label>
          <input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="admin-input"
            maxLength={40}
            placeholder="Jaise: Freshers 2026 — naya naam likho ya purana chuno"
            list="album-options"
          />
          <datalist id="album-options">
            {albums.map((a) => <option key={a} value={a} />)}
          </datalist>

          {error && <p className="admin-error">{error}</p>}
          {uploading && progress && <p className="admin-progress">{progress}</p>}
          <button className="admin-btn" onClick={handleUpload} disabled={uploading || picked.length === 0}>
            {uploading ? <><Loader2 size={16} className="spin" /> Upload ho raha hai…</> : <><Upload size={16} /> {picked.length > 0 ? `${picked.length} Photos Post karein` : 'Photos Post karein'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
