export interface GalleryImage {
  title: string
  detail: string
  src: string
  /** Desktop grid width in columns (1–12). */
  width: number
  /** Desktop grid height in rows. */
  height: number
}

export const images: GalleryImage[] = [
  { 
    title: 'Two of us', 
    detail: 'blue skies, pink sweaters', 
    src: '/photos/Solasta9.png',
    width: 7,
    height: 6 
  },
  { 
    title: 'Side by side', 
    detail: 'a little playful moment', 
    src: '/photos/anime2.jpg',
    width: 1,
    height: 1 
  },
  { 
    title: 'Quiet portrait', 
    detail: 'soft lines, dark layers', 
    src: '/photos/anime3.jpg',
    width: 5,
    height: 5 
  },
  { 
    title: 'Portfolio 24', 
    detail: 'a creative self portrait', 
    src: '/photos/anime4.jpg',
    width: 4,
    height: 5 
  },
  { 
    title: 'Flower delivery', 
    detail: 'bright colors, warm hands', 
    src: '/photos/anime5.jpg',
    width: 4,
    height: 4 
  },
   { 
    title: 'Anime', 
    detail: 'bright colors, warm hands', 
    src: '/photos/anime6.jpg',
    width: 4,
    height: 5 
  },
  { 
    title: 'konichiwa', 
    detail: 'bright colors, warm hands', 
    src: '/photos/anime6.jpg',
    width: 4,
    height: 5 
  },
]
