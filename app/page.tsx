'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun, X, Plus, LogOut, Trash2, ShieldCheck } from 'lucide-react'
import { images as initialImages, type GalleryImage } from '@/lib/gallery-data'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminUpload from '@/components/admin/AdminUpload'
import { isAdminLoggedIn, clearAdminSession } from '@/lib/admin-auth'

type Copy = {
  eyebrow: string
  title: string
  headerCopy: string
  date: string
  footerHint: string
  journal: string
}

const GALLERY_STORE_KEY = 'kist_custom_gallery'
const DELETED_STORE_KEY = 'kist_deleted_gallery'

// Server (Netlify Blobs) se gallery lao — sab devices par same dikhega
// Agar server fail ho to localStorage fallback
async function loadGalleryFromServer(): Promise<{ custom: GalleryImage[]; deleted: string[]; useFallback: boolean }> {
  try {
    const res = await fetch('/api/gallery', { cache: 'no-store' })
    if (!res.ok) throw new Error('api fail')
    const data = await res.json()
    if (data.fallback) throw new Error('fallback')
    return { custom: data.custom || [], deleted: data.deleted || [], useFallback: false }
  } catch {
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(GALLERY_STORE_KEY)
      const custom = raw ? (JSON.parse(raw) as GalleryImage[]) : []
      const delRaw = localStorage.getItem(DELETED_STORE_KEY)
      const deleted = delRaw ? (JSON.parse(delRaw) as string[]) : []
      return { custom, deleted, useFallback: true }
    } catch {
      return { custom: [], deleted: [], useFallback: true }
    }
  }
}

function buildGallery(custom: GalleryImage[], deleted: string[]): GalleryImage[] {
  const deletedSet = new Set(deleted)
  const initial = initialImages.slice(1).filter((img) => !deletedSet.has(img.src))
  return [...custom, ...initial]
}

function saveLocalFallback(custom: GalleryImage[], deleted: string[]) {
  try {
    const onlyCustom = custom.filter((img) => img.src.startsWith('data:'))
    localStorage.setItem(GALLERY_STORE_KEY, JSON.stringify(onlyCustom))
    localStorage.setItem(DELETED_STORE_KEY, JSON.stringify(deleted))
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
  const [galleryMeta, setGalleryMeta] = useState<{ custom: GalleryImage[]; deleted: string[]; useFallback: boolean }>({
    custom: [],
    deleted: [],
    useFallback: true,
  })

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'light' || current === 'dark') setTheme(current)
    setIsAdmin(isAdminLoggedIn())
    // Server se gallery load karo
    loadGalleryFromServer().then(({ custom, deleted, useFallback }) => {
      setGalleryMeta({ custom, deleted, useFallback })
      setGalleryImages(buildGallery(custom, deleted))
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
    date: '19 September 2026',
    footerHint: 'Thank you for celebrating with us.',
    journal: 'Get in touch',
  })

  const activeImage = activeIndex === null ? null : galleryImages[activeIndex]

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

  const handleAddPhoto = async (img: GalleryImage) => {
    // Pehle UI me turant dikhao
    const newCustom = [img, ...galleryMeta.custom]
    const newMeta = { ...galleryMeta, custom: newCustom }
    setGalleryMeta(newMeta)
    setGalleryImages(buildGallery(newCustom, newMeta.deleted))
    if (newMeta.useFallback) saveLocalFallback(newCustom, newMeta.deleted)

    // Phir server par save karo taaki sab devices par dikhe
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', image: img }),
      })
      if (res.ok) {
        const data = await res.json()
        const serverMeta = { custom: data.custom || newCustom, deleted: data.deleted || newMeta.deleted, useFallback: false }
        setGalleryMeta(serverMeta)
        setGalleryImages(buildGallery(serverMeta.custom, serverMeta.deleted))
      }
    } catch {}
  }

  const handleDelete = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Ye photo delete karein?')) return
    const target = galleryImages[index]
    if (!target) return

    // UI se turant hatao
    const newCustom = galleryMeta.custom.filter((c) => c.src !== target.src)
    const newDeleted = target.src.startsWith('data:')
      ? galleryMeta.deleted
      : [...galleryMeta.deleted, target.src]
    const newMeta = { ...galleryMeta, custom: newCustom, deleted: newDeleted }
    setGalleryMeta(newMeta)
    setGalleryImages(buildGallery(newCustom, newDeleted))
    if (newMeta.useFallback) saveLocalFallback(newCustom, newDeleted)
    if (activeIndex !== null) setActiveIndex(null)

    // Server par bhi delete karo
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', src: target.src }),
      })
      if (res.ok) {
        const data = await res.json()
        const serverMeta = { custom: data.custom || newCustom, deleted: data.deleted || newDeleted, useFallback: false }
        setGalleryMeta(serverMeta)
        setGalleryImages(buildGallery(serverMeta.custom, serverMeta.deleted))
      }
    } catch {}
  }

  const handleLogout = () => {
    clearAdminSession()
    setIsAdmin(false)
  }

  return (
    <main>
      <nav className="site-nav">
        <a className="nav-mark" href="#top">
          <img className="nav-logo" src="/apple-icon.png" alt="KIST logo" />
          KIST
        </a>
        <div className="nav-right">
          {isAdmin ? (
            <>
              <button className="admin-nav-btn" onClick={() => setShowUpload(true)}>
                <Plus size={14} /> Photo Post
              </button>
              <button className="admin-nav-btn ghost" onClick={handleLogout} title="Logout">
                <LogOut size={14} /> Logout
              </button>
              <span className="admin-badge"><ShieldCheck size={12} /> Admin</span>
            </>
          ) : (
            <button className="admin-nav-btn ghost" onClick={() => setShowLogin(true)}>
              <ShieldCheck size={14} /> Admin Login
            </button>
          )}
          <a
            className="nav-link"
            href="https://www.instagram.com/reel/DdYwxvXgfjW/?stkn=MXhpMW9jNjVubmVocg=="
            target="_blank"
            rel="noreferrer"
          >
            {copy.journal}
          </a>
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
            <span>{galleryImages.length} photographs</span>
          </div>
          {isAdmin && (
            <button className="hero-post-btn" onClick={() => setShowUpload(true)}>
              <Plus size={16} /> Nayi Photo Post karein
            </button>
          )}
        </div>
      </header>

      <div className="gallery-shell">
        <section className="gallery-section">
          <div className="gallery-section-head">
            <h2>The gallery</h2>
            <p>Every frame from the night, in order.</p>
            {isAdmin && <p className="admin-note">Admin mode: photos par delete button dikhega.</p>}
          </div>

          <div className="gallery-grid" aria-label="Photo gallery">
            {galleryImages.map((image, index) => (
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
                {isAdmin && (
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(index, e)}
                    aria-label="Delete photo"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
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
          onClick={() => setActiveIndex(null)}
        >
          <button className="close-lightbox" onClick={() => setActiveIndex(null)} aria-label="Close fullscreen image">
            <X size={20} />
          </button>
          <button
            className="lightbox-arrow previous"
            onClick={(event) => {
              event.stopPropagation()
              setActiveIndex((activeIndex - 1 + galleryImages.length) % galleryImages.length)
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img className="lightbox-image" src={activeImage.src} alt={activeImage.alt} />
            <div className="lightbox-caption">
              <span>{String(activeIndex + 1).padStart(2, '0')} / {String(galleryImages.length).padStart(2, '0')}</span>
              <strong>{activeImage.title}</strong>
              <small>{activeImage.detail}</small>
            </div>
          </div>
          <button
            className="lightbox-arrow next"
            onClick={(event) => {
              event.stopPropagation()
              setActiveIndex((activeIndex + 1) % galleryImages.length)
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
          onClose={() => setShowUpload(false)}
          onAdd={handleAddPhoto}
        />
      )}
    </main>
  )
}
