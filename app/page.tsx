'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun, X, Plus, LogOut, Trash2, ShieldCheck, Pencil, Heart, Download } from 'lucide-react'
import { images as initialImages, type GalleryImage, type GalleryEdits } from '@/lib/gallery-data'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminUpload from '@/components/admin/AdminUpload'
import AdminEdit from '@/components/admin/AdminEdit'
import { isAdminLoggedIn, clearAdminSession, authHeaders } from '@/lib/admin-auth'

type Copy = {
  eyebrow: string
  title: string
  headerCopy: string
  date: string
  footerHint: string
  journal: string
}

const GALLERY_STORE_KEY = 'kist_custom_gallery'
const LIKED_STORE_KEY = 'kist_liked'
const DELETED_STORE_KEY = 'kist_deleted_gallery'
const EDITS_STORE_KEY = 'kist_edits_gallery'

// Load the gallery from the server (Netlify Blobs) — same on all devices
// localStorage fallback if the server fails
async function loadGalleryFromServer(): Promise<{ custom: GalleryImage[]; deleted: string[]; edits: GalleryEdits; albums: string[]; likes: Record<string, number>; useFallback: boolean }> {
  try {
    const res = await fetch('/api/gallery', { cache: 'no-store' })
    if (!res.ok) throw new Error('api fail')
    const data = await res.json()
    if (data.fallback) throw new Error('fallback')
    return { custom: data.custom || [], deleted: data.deleted || [], edits: data.edits || {}, albums: data.albums || [], likes: data.likes || {}, useFallback: false }
  } catch {
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(GALLERY_STORE_KEY)
      const custom = raw ? (JSON.parse(raw) as GalleryImage[]) : []
      const delRaw = localStorage.getItem(DELETED_STORE_KEY)
      const deleted = delRaw ? (JSON.parse(delRaw) as string[]) : []
      const editsRaw = localStorage.getItem(EDITS_STORE_KEY)
      const edits = editsRaw ? (JSON.parse(editsRaw) as GalleryEdits) : {}
      return { custom, deleted, edits, albums: [], likes: {}, useFallback: true }
    } catch {
      return { custom: [], deleted: [], edits: {}, albums: [], likes: {}, useFallback: true }
    }
  }
}

function buildGallery(custom: GalleryImage[], deleted: string[], edits: GalleryEdits): GalleryImage[] {
  const deletedSet = new Set(deleted)
  // Apply the admin's caption edits (to custom + bundled photos)
  const applyEdits = (img: GalleryImage): GalleryImage => {
    const e = edits[img.src]
    if (!e) return img
    return {
      ...img,
      title: e.title,
      detail: e.detail,
      alt: e.title,
      ...(e.album !== undefined ? { album: e.album || undefined } : {}),
    }
  }
  const initial = initialImages.slice(1).filter((img) => !deletedSet.has(img.src)).map(applyEdits)
  return [...custom.map(applyEdits), ...initial]
}

function saveLocalFallback(custom: GalleryImage[], deleted: string[], edits: GalleryEdits) {
  try {
    const onlyCustom = custom.filter((img) => img.src.startsWith('data:'))
    localStorage.setItem(GALLERY_STORE_KEY, JSON.stringify(onlyCustom))
    localStorage.setItem(DELETED_STORE_KEY, JSON.stringify(deleted))
    localStorage.setItem(EDITS_STORE_KEY, JSON.stringify(edits))
  } catch {}
}

export default function Page() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [heroImage] = useState<GalleryImage>(initialImages[0])
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(initialImages.slice(1))
  const [scrollFade, setScrollFade] = useState(1)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  // Admin states
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showCollegeInfo, setShowCollegeInfo] = useState(false)
  const [editTarget, setEditTarget] = useState<{ image: GalleryImage } | null>(null)
  const [galleryMeta, setGalleryMeta] = useState<{ custom: GalleryImage[]; deleted: string[]; edits: GalleryEdits; albums: string[]; likes: Record<string, number>; useFallback: boolean }>({
    custom: [],
    deleted: [],
    edits: {},
    albums: [],
    likes: {},
    useFallback: true,
  })
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  // Keep the first render empty like the server (avoid hydration mismatch),
  // load likes from localStorage only AFTER the page opens
  const [likedSrcs, setLikedSrcs] = useState<string[]>([])

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'light' || current === 'dark') setTheme(current)
    setIsAdmin(isAdminLoggedIn())
    // Photos liked earlier on this device — load after hydration
    try { setLikedSrcs(JSON.parse(localStorage.getItem(LIKED_STORE_KEY) || '[]') as string[]) } catch {}
    // Load the gallery from the server
    loadGalleryFromServer().then(({ custom, deleted, edits, albums, likes, useFallback }) => {
      setGalleryMeta({ custom, deleted, edits, albums, likes, useFallback })
      setGalleryImages(buildGallery(custom, deleted, edits))
    })
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch {}
  }

  const [copy] = useState<Copy>({
    eyebrow: 'Konark Institute Of Science And Technology',
    title: 'SOLASTA',
    headerCopy: 'The freshers party of Batch 26 —\ncaptured in a single night.',
    date: '03 October 2026',
    footerHint: 'Thank you for celebrating with us.',
    journal: 'Get in touch',
  })

  // Album filter: show only photos of the selected album
  const visibleImages = useMemo(() => {
    if (!activeAlbum) return galleryImages
    return galleryImages.filter((img) => img.album === activeAlbum)
  }, [galleryImages, activeAlbum])

  // Album list: from the server + ones set on photos (don't miss any)
  const allAlbums = useMemo(() => {
    const set = new Set(galleryMeta.albums)
    for (const img of galleryImages) {
      const a = (img.album || '').trim()
      if (a) set.add(a)
    }
    return [...set]
  }, [galleryMeta.albums, galleryImages])

  const activeImage = activeIndex === null ? null : visibleImages[activeIndex]

  // In the lightbox (fullscreen), swipe left/right on phones to change photo
  const lightboxTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lightboxSwipedRef = useRef(false)

  // Lightbox caption scroll — fade the image when text scrolls up
  const captionTextRef = useRef<HTMLElement | null>(null)
  const [captionFaded, setCaptionFaded] = useState(false)

  // Reset caption scroll when another photo opens
  useEffect(() => {
    setCaptionFaded(false)
    if (captionTextRef.current) captionTextRef.current.scrollTop = 0
  }, [activeIndex])

  const handleCaptionScroll = () => {
    const el = captionTextRef.current
    if (!el) return
    setCaptionFaded(el.scrollTop > 24)
  }

  useEffect(() => {
    if (activeIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex((activeIndex + 1) % galleryImages.length)
      if (event.key === 'ArrowLeft') setActiveIndex((activeIndex - 1 + galleryImages.length) % galleryImages.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, galleryImages.length])

  useEffect(() => {
    const fadeDistance = 400
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / fadeDistance, 1)
      setScrollFade(1 - progress)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Admin posted several photos at once (bulk upload) — UI first, then server.
  // Returns true/false depending on whether the server save worked.
  const handleAddMany = async (images: GalleryImage[]): Promise<boolean> => {
    // Show in the UI immediately
    const newCustom = [...images, ...galleryMeta.custom]
    const newAlbums = [...galleryMeta.albums]
    for (const img of images) {
      const a = (img.album || '').trim()
      if (a && !newAlbums.includes(a)) newAlbums.push(a)
    }
    const newMeta = { ...galleryMeta, custom: newCustom, albums: newAlbums }
    setGalleryMeta(newMeta)
    setGalleryImages(buildGallery(newCustom, newMeta.deleted, newMeta.edits))
    if (newMeta.useFallback) saveLocalFallback(newCustom, newMeta.deleted, newMeta.edits)

    // Then save to the server so all devices see it
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'addMany', images }),
      })
      if (res.status === 403) {
        handleLogout()
        alert('Admin session expired — please log in again')
        return false
      }
      if (res.ok) {
        const data = await res.json()
        const serverMeta = {
          custom: data.custom || newCustom,
          deleted: data.deleted || newMeta.deleted,
          edits: data.edits || newMeta.edits,
          albums: data.albums || newAlbums,
          likes: galleryMeta.likes,
          useFallback: false,
        }
        setGalleryMeta(serverMeta)
        setGalleryImages(buildGallery(serverMeta.custom, serverMeta.deleted, serverMeta.edits))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Admin edited a caption — UI first, then save to the server
  const handleEditSave = async (title: string, detail: string, album: string) => {
    if (!editTarget) return
    const src = editTarget.image.src
    const newEdits: GalleryEdits = { ...galleryMeta.edits, [src]: { title, detail, album } }
    // Also update title/album of uploaded photos in custom (optimistic)
    const newCustom = galleryMeta.custom.map((c) =>
      c.src === src ? { ...c, title, detail, album: album || undefined } : c,
    )
    const newAlbums = [...galleryMeta.albums]
    if (album && !newAlbums.includes(album)) newAlbums.push(album)
    const newMeta = { ...galleryMeta, edits: newEdits, custom: newCustom, albums: newAlbums }
    setGalleryMeta(newMeta)
    setGalleryImages(buildGallery(newCustom, newMeta.deleted, newEdits))
    if (newMeta.useFallback) saveLocalFallback(newCustom, newMeta.deleted, newEdits)
    setEditTarget(null)

    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'edit', src, title, detail, album }),
      })
      if (res.status === 403) {
        handleLogout()
        alert('Admin session expired — please log in again')
        return
      }
      if (res.ok) {
        const data = await res.json()
        const serverMeta = {
          custom: data.custom || newCustom,
          deleted: data.deleted || newMeta.deleted,
          edits: data.edits || newEdits,
          albums: data.albums || newAlbums,
          likes: galleryMeta.likes,
          useFallback: false,
        }
        setGalleryMeta(serverMeta)
        setGalleryImages(buildGallery(serverMeta.custom, serverMeta.deleted, serverMeta.edits))
      }
    } catch {}
  }

  const handleDelete = async (src: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this photo?')) return
    const target = galleryImages.find((g) => g.src === src)
    if (!target) return

    // Remove from the UI immediately — restore below if the server fails
    const prevMeta = galleryMeta
    const prevImages = galleryImages
    const newCustom = galleryMeta.custom.filter((c) => c.src !== target.src)
    // Only old bundled photos (/photos/...) go to the deleted list;
    // uploaded photos (data: or /api/photo/) are deleted from the server itself
    const newDeleted = target.src.startsWith('/photos/')
      ? [...galleryMeta.deleted, target.src]
      : galleryMeta.deleted
    const newMeta = { ...galleryMeta, custom: newCustom, deleted: newDeleted }
    setGalleryMeta(newMeta)
    setGalleryImages(buildGallery(newCustom, newDeleted, newMeta.edits))
    if (newMeta.useFallback) saveLocalFallback(newCustom, newDeleted, newMeta.edits)
    if (activeIndex !== null) setActiveIndex(null)

    // Also delete on the server
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'delete', src: target.src }),
      })
      if (res.status === 403) {
        handleLogout()
        alert('Admin session expired — please log in again')
        return
      }
      if (!res.ok) throw new Error('server delete fail')
      const data = await res.json()
      const serverMeta = { custom: data.custom || newCustom, deleted: data.deleted || newDeleted, edits: data.edits || newMeta.edits, albums: data.albums || galleryMeta.albums, likes: galleryMeta.likes, useFallback: false }
      setGalleryMeta(serverMeta)
      setGalleryImages(buildGallery(serverMeta.custom, serverMeta.deleted, serverMeta.edits))
    } catch {
      // Server delete failed — bring the photo back to avoid "it came back" confusion
      setGalleryMeta(prevMeta)
      setGalleryImages(prevImages)
      alert('Could not delete the photo — please try again')
    }
  }

  // A student liked/unliked a photo — no login; tapping again removes the like
  const handleLike = async (src: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const isLiked = likedSrcs.includes(src)
    try {
      const next = isLiked ? likedSrcs.filter((s) => s !== src) : [...likedSrcs, src]
      setLikedSrcs(next)
      localStorage.setItem(LIKED_STORE_KEY, JSON.stringify(next))
      // Pehle UI me turant badlo
      setGalleryMeta((prev) => ({
        ...prev,
        likes: { ...prev.likes, [src]: Math.max(0, (prev.likes[src] || 0) + (isLiked ? -1 : 1)) },
      }))
      // Then save to the server
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, action: isLiked ? 'unlike' : 'like' }),
      })
      if (res.ok) {
        const data = await res.json()
        setGalleryMeta((prev) => ({ ...prev, likes: { ...prev.likes, [src]: data.likes } }))
      }
    } catch {}
  }

  // Admin: download a ZIP backup of all uploaded photos
  const handleBackup = async () => {
    if (backingUp) return
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup', { headers: { ...authHeaders() } })
      if (res.status === 403) {
        handleLogout()
        alert('Admin session expired — please log in again')
        return
      }
      if (!res.ok) throw new Error('backup fail')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solasta-backup-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not download the backup — please try again')
    } finally {
      setBackingUp(false)
    }
  }

  const handleLogout = () => {
    clearAdminSession()
    setIsAdmin(false)
  }

  return (
    <main>
      <nav className="site-nav">
        <button className="nav-mark nav-mark-btn" onClick={() => setShowCollegeInfo(true)} title="College ke baare me jaano">
          <img className="nav-logo" src="/apple-icon.png" alt="KIST logo" />
          KIST
        </button>
        <div className="nav-right">
          {isAdmin ? (
            <>
              <button className="admin-nav-btn" onClick={() => setShowUpload(true)} title="Photo Post">
                <Plus size={14} /> <span className="admin-nav-btn-label">Photo Post</span>
              </button>
              <button className="admin-nav-btn ghost" onClick={handleLogout} title="Logout">
                <LogOut size={14} /> <span className="admin-nav-btn-label">Logout</span>
              </button>
              <span className="admin-badge"><ShieldCheck size={12} /> Admin</span>
            </>
          ) : (
            <button className="admin-nav-btn ghost" onClick={() => setShowLogin(true)}>
              <ShieldCheck size={14} /> <span className="admin-nav-btn-label">Admin Login</span>
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </div>
      </nav>

      <header className="hero" id="top">
        <img
          className="hero-media"
          src={heroImage.src}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        <div className="hero-scrim" />
        <div
          className="hero-content"
          style={{
            opacity: scrollFade,
            transform: `translateY(${(1 - scrollFade) * 24}px)`,
          }}
        >
          <p className="hero-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="hero-copy">{copy.headerCopy}</p>
          <div className="hero-meta">
            <span>{copy.date}</span>
            <span>{visibleImages.length} photographs</span>
          </div>
          {isAdmin && (
            <button className="hero-post-btn" onClick={() => setShowUpload(true)}>
              <Plus size={16} /> Post New Photo
            </button>
          )}
        </div>
      </header>

      <div className="gallery-shell">
        <section className="gallery-section">
          <div className="gallery-section-head">
            <h2>The gallery</h2>
            <p>Every frame from the night, in order.</p>
            {isAdmin && (
              <p className="admin-note">
                Admin mode: edit/delete buttons are shown on photos.
                <button className="backup-btn" onClick={handleBackup} disabled={backingUp} title="Download a backup of all photos">
                  <Download size={13} /> {backingUp ? 'Preparing backup…' : 'Backup download'}
                </button>
              </p>
            )}
          </div>

          {allAlbums.length > 0 && (
            <div className="album-chips" role="tablist" aria-label="Albums">
              <button
                className={`album-chip${!activeAlbum ? ' active' : ''}`}
                onClick={() => setActiveAlbum(null)}
                role="tab"
                aria-selected={!activeAlbum}
              >
                All
              </button>
              {allAlbums.map((a) => (
                <button
                  key={a}
                  className={`album-chip${activeAlbum === a ? ' active' : ''}`}
                  onClick={() => setActiveAlbum(activeAlbum === a ? null : a)}
                  role="tab"
                  aria-selected={activeAlbum === a}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          <div className="gallery-grid" aria-label="Photo gallery">
            {visibleImages.map((image, index) => (
              <div key={`${image.src}-${index}`} className="gallery-card-wrap">
                <button
                  className={`gallery-card card-${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View ${image.title} fullscreen`}
                >
                  <span className="frame">
                    <img
                      className="gallery-photo"
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="card-caption">
                    <strong>{image.title}</strong>
                    <small>{image.detail}</small>
                  </span>
                </button>
                <button
                  className={`like-btn${likedSrcs.includes(image.src) ? ' liked' : ''}`}
                  onClick={(e) => handleLike(image.src, e)}
                  aria-label="Like this photo"
                  title="Like"
                >
                  <Heart size={14} fill={likedSrcs.includes(image.src) ? 'currentColor' : 'none'} />
                  {(galleryMeta.likes[image.src] || 0) > 0 && (
                    <span className="like-count">{galleryMeta.likes[image.src]}</span>
                  )}
                </button>
                {isAdmin && (
                  <>
                    <button
                      className="edit-btn"
                      onClick={(e) => { e.stopPropagation(); setEditTarget({ image }) }}
                      aria-label="Edit caption"
                      title="Edit caption"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(image.src, e)}
                      aria-label="Delete photo"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="gallery-footer">
          <span>{copy.footerHint}</span>
         <a
            className="journal-link"
            href="https://www.instagram.com/reel/DdYwxvXgfjW/?stkn=MXhpMW9jNjVubmVocg=="
            target="_blank"
            rel="noreferrer"
          >
            {copy.journal}
          </a>
          
        </footer>
      </div>

      {activeImage && activeIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeImage.title} fullscreen view`}
          onClick={() => {
            // Ignore the click that follows a swipe — the lightbox must not close
            if (lightboxSwipedRef.current) { lightboxSwipedRef.current = false; return }
            setActiveIndex(null)
          }}
          onTouchStart={(event) => {
            const t = event.touches[0]
            lightboxTouchRef.current = { x: t.clientX, y: t.clientY }
          }}
          onTouchEnd={(event) => {
            const start = lightboxTouchRef.current
            lightboxTouchRef.current = null
            if (!start || activeIndex === null) return
            const t = event.changedTouches[0]
            const dx = t.clientX - start.x
            const dy = t.clientY - start.y
            // Under 50px or a vertical swipe — ignore (keep caption vertical scroll working)
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
            lightboxSwipedRef.current = true
            const dir = dx < 0 ? 1 : -1 // left swipe = next photo, right swipe = previous photo
            setActiveIndex((activeIndex + dir + visibleImages.length) % visibleImages.length)
          }}
        >
          <button className="close-lightbox" onClick={() => setActiveIndex(null)} aria-label="Close fullscreen image">
            <X size={20} />
          </button>
          <button
            className="lightbox-arrow previous"
            onClick={(event) => {
              event.stopPropagation()
              setActiveIndex((activeIndex - 1 + visibleImages.length) % visibleImages.length)
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="lightbox-content" onClick={(event) => { lightboxSwipedRef.current = false; event.stopPropagation() }}>
            <img className="lightbox-image" src={activeImage.src} alt={activeImage.alt} />
            <div className="lightbox-caption">
              <div className="lightbox-caption-head">
                <span className="lightbox-count">{String(activeIndex + 1).padStart(2, '0')} / {String(visibleImages.length).padStart(2, '0')}</span>
                <strong>{activeImage.title}</strong>
                <button
                  className={`lightbox-like${likedSrcs.includes(activeImage.src) ? ' liked' : ''}`}
                  onClick={(event) => handleLike(activeImage.src, event)}
                  aria-label="Like this photo"
                  title="Like"
                >
                  <Heart size={16} fill={likedSrcs.includes(activeImage.src) ? 'currentColor' : 'none'} />
                  {(galleryMeta.likes[activeImage.src] || 0) > 0 && (
                    <span>{galleryMeta.likes[activeImage.src]}</span>
                  )}
                </button>
              </div>
              {activeImage.detail && (
                <small
                  ref={captionTextRef}
                  onScroll={handleCaptionScroll}
                  className={`lightbox-caption-text${captionFaded ? ' is-faded' : ''}`}
                >
                  {activeImage.detail}
                </small>
              )}
            </div>
          </div>
          <button
            className="lightbox-arrow next"
            onClick={(event) => {
              event.stopPropagation()
              setActiveIndex((activeIndex + 1) % visibleImages.length)
            }}
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => { setIsAdmin(true); setShowLogin(false) }}
        />
      )}
      {showUpload && isAdmin && (
        <AdminUpload
          albums={allAlbums}
          onClose={() => setShowUpload(false)}
          onAddMany={handleAddMany}
        />
      )}
      {editTarget && isAdmin && (
        <AdminEdit
          photoSrc={editTarget.image.src}
          initialTitle={editTarget.image.title}
          initialDetail={editTarget.image.detail}
          initialAlbum={editTarget.image.album}
          albums={allAlbums}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}
      {showCollegeInfo && (
        <div className="admin-overlay" onClick={() => setShowCollegeInfo(false)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="About the college"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="admin-close" onClick={() => setShowCollegeInfo(false)} aria-label="Close">
              <X size={16} />
            </button>
            <div className="admin-head">
              <div className="admin-icon">
                <img className="nav-logo" src="/apple-icon.png" alt="KIST logo" style={{ width: 28, height: 28 }} />
              </div>
              <h3>Konark Institute of Science and Technology</h3>
              <p>KIST — Bhubaneswar, Odisha</p>
            </div>
            <div className="college-facts">
              <p><strong>Private</strong> engineering college — established <strong>2001</strong></p>
              <p>Jatni, Bhubaneswar (Odisha)</p>
              <p>Affiliated to Biju Patnaik University of Technology (BPUT) · AICTE approved</p>
              <p>Courses: B.Tech, M.Tech, MBA</p>
            </div>
            <a className="admin-btn" href="https://www.kist.ac.in" target="_blank" rel="noreferrer">
              Open college website
            </a>
          </div>
        </div>
      )}
    </main>
  )
}
