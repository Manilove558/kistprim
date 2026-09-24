'use client'

import { useState } from 'react'
import { X, Upload, Loader2, ImagePlus } from 'lucide-react'
import type { GalleryImage } from '@/lib/gallery-data'

type Props = {
  onClose: () => void
  onAdd: (img: GalleryImage) => void
}

export default function AdminUpload({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Sirf image file chunein (jpg/png)')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Photo 5MB se chhoti honi chahiye')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handlePost = () => {
    setError('')
    if (!preview) { setError('Pehle photo chunein'); return }
    if (!title.trim()) { setError('Title likhein'); return }
    setLoading(true)
    try {
      const img: GalleryImage = {
        title: title.trim(),
        detail: detail.trim() || 'admin upload',
        alt: title.trim(),
        src: preview,
        width: 4,
        height: 4,
      }
      onAdd(img)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Photo post karein">
        <button className="admin-close" onClick={onClose} aria-label="Band karein"><X size={18} /></button>
        <div className="admin-head">
          <span className="admin-icon"><ImagePlus size={22} /></span>
          <h3>Photo Post karein</h3>
          <p>Sirf admin ko dikhta hai</p>
        </div>
        <div className="admin-body">
          <label className="admin-upload-box" onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }} onDragOver={(e) => e.preventDefault()}>
            {preview ? (
              <img src={preview} alt="preview" className="admin-preview" />
            ) : (
              <span className="admin-upload-hint"><Upload size={24} /><span>Photo chunein ya yahan drop karein</span></span>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>

          <label className="admin-label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Freshers night" className="admin-input" />

          <label className="admin-label">Detail (optional)</label>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. dance floor moment" className="admin-input" />

          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" onClick={handlePost} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Post ho raha…</> : 'Post Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
