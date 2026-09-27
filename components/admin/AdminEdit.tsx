'use client'

import { useState } from 'react'
import { X, Pencil, Loader2 } from 'lucide-react'

type Props = {
  photoSrc: string
  initialTitle: string
  initialDetail: string
  initialAlbum?: string
  albums: string[]
  onClose: () => void
  onSave: (title: string, detail: string, album: string) => Promise<void> | void
}

export default function AdminEdit({ photoSrc, initialTitle, initialDetail, initialAlbum, albums, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [detail, setDetail] = useState(initialDetail)
  const [album, setAlbum] = useState(initialAlbum || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('Title cannot be empty'); return }
    setLoading(true)
    try {
      await onSave(title.trim(), detail.trim(), album.trim())
      onClose()
    } catch {
      setError('Could not save — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit caption">
        <button className="admin-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="admin-head">
          <span className="admin-icon"><Pencil size={22} /></span>
          <h3>Edit Caption</h3>
          <p>You can change the title, detail and album</p>
        </div>
        <div className="admin-body">
          <img src={photoSrc} alt="" className="admin-edit-thumb" />

          <label className="admin-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="admin-input"
            maxLength={80}
            placeholder="Photo title"
          />

          <label className="admin-label">Detail</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="admin-textarea"
            rows={4}
            maxLength={500}
            placeholder="Write about the photo"
          />

          <label className="admin-label">Album (empty = no album)</label>
          <input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="admin-input"
            maxLength={40}
            placeholder="Album name"
            list="album-options-edit"
          />
          <datalist id="album-options-edit">
            {albums.map((a) => <option key={a} value={a} />)}
          </datalist>

          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
