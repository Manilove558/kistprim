'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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
