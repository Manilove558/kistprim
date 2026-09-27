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
  onAddMany: (images: GalleryImage[]) => Promise<void>
}

const MAX_MB = 5

function fileTitle(name: string): string {
  const base = name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]+/g, ' ').trim()
  return base || 'Photo'
}

export default function AdminUpload({ albums, onClose, onAddMany }: Props) {
  const [picked, setPicked] = useState<Picked[]>([])
  const [album, setAlbum] = useState('')
  const [detail, setDetail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    setError('')
    const next: Picked[] = [...picked]
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" 5MB se badi hai — chhoti karke phir chunein`)
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
    if (picked.length === 0) { setError('Pehle photos chunein'); return }
    setUploading(true)
    try {
      const albumName = album.trim()
      const images: GalleryImage[] = await Promise.all(
        picked.map(async (p, i) => {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(p.file)
          })
          return {
            title: p.title.trim() || `Photo ${i + 1}`,
            detail: detail.trim(),
            alt: p.title.trim() || `Photo ${i + 1}`,
            src: dataUrl,
            width: 4,
            height: 4,
            ...(albumName ? { album: albumName } : {}),
          } as GalleryImage
        }),
      )
      await onAddMany(images)
      picked.forEach((p) => URL.revokeObjectURL(p.preview))
      onClose()
    } catch {
      setError('Upload nahi ho paya — phir try karein')
      setUploading(false)
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

          <label className="admin-label">Detail (sab photos par same lagega, optional)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="admin-textarea"
            rows={2}
            maxLength={500}
            placeholder="Event ke baare me ek line"
          />

          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" onClick={handleUpload} disabled={uploading || picked.length === 0}>
            {uploading ? <><Loader2 size={16} className="spin" /> {picked.length} photos upload ho rahi hain…</> : <><Upload size={16} /> {picked.length > 0 ? `${picked.length} Photos Post karein` : 'Photos Post karein'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
