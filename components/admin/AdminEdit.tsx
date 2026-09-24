'use client'

import { useState } from 'react'
import { X, Pencil, Loader2 } from 'lucide-react'

type Props = {
  photoSrc: string
  initialTitle: string
  initialDetail: string
  onClose: () => void
  onSave: (title: string, detail: string) => Promise<void> | void
}

export default function AdminEdit({ photoSrc, initialTitle, initialDetail, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [detail, setDetail] = useState(initialDetail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('Title khaali nahi ho sakta'); return }
    setLoading(true)
    try {
      await onSave(title.trim(), detail.trim())
      onClose()
    } catch {
      setError('Save nahi ho paya, dobara try karein')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Caption edit karein">
        <button className="admin-close" onClick={onClose} aria-label="Band karein"><X size={18} /></button>
        <div className="admin-head">
          <span className="admin-icon"><Pencil size={22} /></span>
          <h3>Caption Edit karein</h3>
          <p>Title aur detail badal sakte ho</p>
        </div>
        <div className="admin-body">
          <img src={photoSrc} alt="" className="admin-edit-thumb" />

          <label className="admin-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="admin-input"
            maxLength={80}
            placeholder="Photo ka title"
          />

          <label className="admin-label">Detail</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="admin-textarea"
            rows={4}
            maxLength={500}
            placeholder="Photo ke baare me likhein"
          />

          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Save ho raha…</> : 'Save karein'}
          </button>
        </div>
      </div>
    </div>
  )
}
