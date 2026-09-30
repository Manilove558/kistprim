export interface GalleryImage {
  title: string
  detail: string
  /**
   * Photo ka chhota text description (alt text).
   * Screen reader ise padhta hai, photo load na ho to yahi dikhta hai,
   * aur Google isse photo samajhta hai. Har photo ke liye alag aur
   * saaf likho — "image" ya "photo" jaisa generic text mat likhna.
   */
  alt: string
  src: string
  /** Desktop grid width in columns (1–12). */
  width: number
  /** Desktop grid height in rows. */
  height: number
  /** Album ka naam (optional) — jaise "Freshers 2026". Khali ho to "Sab" me dikhega. */
  album?: string
}

/**
 * Admin ke caption edits — photo ke src se uska naya title/detail ka map.
 * Netlify Blobs (edits.json) me save hota hai taaki sab devices par same dikhe.
 */
export type GalleryEdits = Record<string, { title: string; detail: string; album?: string }>

export const images: GalleryImage[] = [
  {
    title: 'Two of us',
    detail: 'blue skies, pink sweaters',
    alt: 'Line-art drawing of a phoenix with wings spread wide, surrounded by tiny stars, on a white background',
    src: '/photos/Solasta9.png',
    width: 7,
    height: 6,
  },
]
