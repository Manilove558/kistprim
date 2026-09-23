'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, MessageCircle, Share2, X } from 'lucide-react'
import { images as initialImages, type GalleryImage } from '@/lib/gallery-data'

// Yeh "copy" text hai — nav, hero banner, footer me dikhne wala saara
// wording ek jagah. Yahan text change karoge to page par turant dikhega.
type Copy = {
  eyebrow: string
  title: string
  headerCopy: string
  date: string
  footerHint: string
  journal: string
  photoCount: string
}

// Download hone wali file ka naam, jaise "solasta-2-quiet-portrait.jpg"
function downloadName(image: GalleryImage, index: number) {
  const extension = image.src.split('.').pop() ?? 'jpg'
  const slug = image.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `solasta-${index + 1}-${slug}.${extension}`
}

export default function Page() {
  // activeIndex batata hai ki kaunsi photo abhi lightbox (fullscreen popup) me khuli hai.
  // null = koi photo open nahi hai (lightbox band hai).
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // heroImage = gallery-data.ts ki PEHLI photo — sirf top (hero) me dikhegi.
  // galleryImages = baaki saari photos — grid aur lightbox sirf inhi ko dikhayenge,
  // isliye hero photo lightbox me kabhi nahi khulegi.
  const [heroImage] = useState<GalleryImage>(initialImages[0])
  const [galleryImages] = useState<GalleryImage[]>(initialImages.slice(1))

  // scrollFade: 1 = hero text pura visible, 0 = pura fade/gayab.
  // Scroll karte hi neeche wale useEffect se ye value dheere-dheere 1 se 0 hoti hai.
  const [scrollFade, setScrollFade] = useState(1)

  // ----------------------------------------------------------------
  // Yahan se hero banner aur footer ka saara TEXT edit karo.
  // ----------------------------------------------------------------
  const [copy] = useState<Copy>({
    eyebrow: 'Konark Institute Of Science And Technology', // hero title ke upar wala chhota label
    title: 'SOLASTA',                                       // hero ka bada heading
    headerCopy: 'The freshers party of Batch 26 —\ncaptured in a single night.', // heading ke neeche subtitle (\n = line break)
    date: '19 September 2026',                              // hero ke neeche date
    footerHint: 'Thank you for celebrating with us.',        // footer ka left text
    journal: 'Get in touch',                                 // nav + footer ka link text
    photoCount: `${galleryImages.length} photographs`,       // sirf gallery ki photos ginti hai (hero photo shamil nahi)
  })

  // activeImage = jo photo abhi lightbox me dikh rahi hai (agar koi khuli hai)
  const activeImage = activeIndex === null ? null : galleryImages[activeIndex]

  // ----------------------------------------------------------------
  // DOWNLOAD / SHARE
  // ----------------------------------------------------------------
  // canNativeShare = phone/browser ka apna share sheet available hai ya nahi.
  // Phone par is sheet me WhatsApp, Instagram, Telegram wagairah sab dikhte hain.
  // (Instagram web link se seedha post nahi ho sakta — sirf isi share sheet se hota hai.)
  const [canNativeShare, setCanNativeShare] = useState(false)
  // shareFile = lightbox me khuli photo ki file, pehle se ready rakhi jaati hai
  // taaki Share dabate hi turant khule (phone browsers ko click ke turant baad share chahiye).
  const [shareFile, setShareFile] = useState<File | null>(null)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  // Nayi photo lightbox me khulte hi uski file fetch karke ready rakho.
  useEffect(() => {
    setShareFile(null)
    if (!canNativeShare || activeIndex === null) return
    const image = galleryImages[activeIndex]
    let cancelled = false
    fetch(image.src)
      .then((response) => response.blob())
      .then((blob) => {
        if (!cancelled) setShareFile(new File([blob], downloadName(image, activeIndex), { type: blob.type }))
      })
      .catch(() => {}) // file na mile to share sirf link bhejega
    return () => {
      cancelled = true
    }
  }, [activeIndex, canNativeShare, galleryImages])

  // Photo ka link + caption — share text me yahi jaata hai.
  const shareText = (image: GalleryImage) => `${image.title} — Solasta, KIST Batch 26`
  const absoluteUrl = (path: string) => new URL(path, window.location.origin).toString()

  // Share button: phone ka share sheet kholta hai (photo file ke saath, agar ho sake).
  const handleShare = async (image: GalleryImage) => {
    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: image.title, text: shareText(image) })
      } else {
        await navigator.share({ title: image.title, text: shareText(image), url: absoluteUrl(image.src) })
      }
    } catch {
      // user ne share sheet band kar di — kuch nahi karna
    }
  }

  // WhatsApp button: WhatsApp me photo ka link + caption ke saath message khulta hai.
  const handleWhatsApp = (image: GalleryImage) => {
    const message = `${shareText(image)}\n${absoluteUrl(image.src)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  // Lightbox khule rehte waqt keyboard se control: Esc = band karo,
  // Left/Right arrow keys = previous/next photo par jao.
  useEffect(() => {
    if (activeIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex((activeIndex + 1) % galleryImages.length)
      if (event.key === 'ArrowLeft') setActiveIndex((activeIndex - 1 + galleryImages.length) % galleryImages.length)
    }
    document.body.style.overflow = 'hidden' // lightbox khule waqt background scroll band
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, galleryImages.length])

  // Scroll hote hi hero text ka fade + subtle upward drift calculate karta hai.
  // fadeDistance = kitne pixels scroll karne par text 100% gayab ho jayega.
  useEffect(() => {
    const fadeDistance = 400
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / fadeDistance, 1)
      setScrollFade(1 - progress)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main>
      {/* ---------------------------------------------------------- */}
      {/* NAV — sabse upar sticky bar: logo + "KIST" (left), link (right) */}
      {/* ---------------------------------------------------------- */}
      <nav className="site-nav">
        <a className="nav-mark" href="#top">
          {/* Logo image — path change karke koi aur logo bhi laga sakte ho.
              Size CSS me .nav-logo class se control hota hai. */}
          <img className="nav-logo" src="/apple-icon.png" alt="KIST logo" />
          KIST
        </a>
        <a
          className="nav-link"
          href="https://www.instagram.com/reel/DdYwxvXgfjW/?stkn=MXhpMW9jNjVubmVocg=="
          target="_blank"
          rel="noreferrer"
        >
          {copy.journal}
        </a>
      </nav>

      {/* ---------------------------------------------------------- */}
      {/* HERO — bada banner: background photo + title + subtitle     */}
      {/* Background photo heroImage (gallery-data.ts ka PEHLA item) hai. */}
      {/* Ye sirf yahin dikhti hai, gallery/lightbox me nahi.            */}
      {/* ---------------------------------------------------------- */}
      <header className="hero" id="top">
        {/* Hero photo screen ke top par hai, isliye lazy NAHI — turant load hoti hai. */}
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
          // Scroll ke saath text fade-out + thoda upar drift hota hai
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
            <span>{copy.photoCount}</span>
          </div>
        </div>
      </header>

      <div className="gallery-shell">
        {/* -------------------------------------------------------- */}
        {/* GALLERY GRID — hero ke neeche wala photo grid             */}
        {/* -------------------------------------------------------- */}
        <section className="gallery-section">
          <div className="gallery-section-head">
            <h2>The gallery</h2>
            <p>Every frame from the night, in order.</p>
          </div>

          <div className="gallery-grid" aria-label="Photo gallery">
            {/* galleryImages me hero photo shamil nahi hai (upar slice(1) se hata di gayi). */}
            {galleryImages.map((image, index) => (
              <button
                className={`gallery-card card-${index + 1}`}
                key={`${image.src}-${index}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View ${image.title} fullscreen`}
              >
                <span className="frame">
                  {/* loading="lazy" = photo tabhi load hogi jab user scroll karke uske paas pahunche. */}
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
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* FOOTER — gallery ke sabse neeche wali line                */}
        {/* -------------------------------------------------------- */}
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

      {/* ---------------------------------------------------------- */}
      {/* LIGHTBOX — photo par click karne se khulne wala fullscreen popup */}
      {/* Sirf tab render hota hai jab activeIndex null nahi hai       */}
      {/* (yaani jab tak koi photo click nahi hui, ye poora block screen par nahi aata) */}
      {/* ---------------------------------------------------------- */}
      {activeImage && activeIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeImage.title} fullscreen view`}
          onClick={() => setActiveIndex(null)} // background par click = popup band
        >
          <button className="close-lightbox" onClick={() => setActiveIndex(null)} aria-label="Close fullscreen image">
            <X size={20} />
          </button>
          <button
            className="lightbox-arrow previous"
            onClick={(event) => {
              event.stopPropagation() // taaki click background tak na pahunche aur popup band na ho
              setActiveIndex((activeIndex - 1 + galleryImages.length) % galleryImages.length)
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img className="lightbox-image" src={activeImage.src} alt={activeImage.alt} />
            <div className="lightbox-caption">
              {/* "01 / 06" jaisa counter — padStart(2, '0') number ko 2-digit banata hai */}
              <span>{String(activeIndex + 1).padStart(2, '0')} / {String(galleryImages.length).padStart(2, '0')}</span>
              <strong>{activeImage.title}</strong>
              <small>{activeImage.detail}</small>
            </div>
            {/* Download / Share / WhatsApp — lightbox me khuli photo ke liye */}
            <div className="lightbox-actions">
              <a
                className="lightbox-action"
                href={activeImage.src}
                download={downloadName(activeImage, activeIndex)}
              >
                <Download size={16} /> Download
              </a>
              {canNativeShare && (
                <button className="lightbox-action" onClick={() => handleShare(activeImage)}>
                  <Share2 size={16} /> Share
                </button>
              )}
              <button className="lightbox-action" onClick={() => handleWhatsApp(activeImage)}>
                <MessageCircle size={16} /> WhatsApp
              </button>
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
    </main>
  )
}
