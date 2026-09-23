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
}

export const images: GalleryImage[] = [
  {
    title: 'Two of us',
    detail: 'blue skies, pink sweaters',
    alt: 'Line-art drawing of a phoenix with wings spread wide, surrounded by tiny stars, on a white background',
    src: '/photos/Solasta9.png',
    width: 7,
    height: 6,
  },
  {
    title: 'Side by side',
    detail: 'a little playful moment',
    alt: 'Anime boy in a plaid scarf and gloves holding a small green ghost under a starry night sky above ruined towers',
    src: '/photos/anime2.jpg',
    width: 1,
    height: 1,
  },
  {
    title: 'Quiet portrait',
    detail: 'soft lines, dark layers',
    alt: 'Anime boy in a black school uniform reaching a glowing hand toward the viewer, with pink and purple energy around him',
    src: '/photos/anime3.jpg',
    width: 5,
    height: 5,
  },
  {
    title: 'Portfolio 24',
    detail: 'a creative self portrait',
    alt: 'Mob Psycho 100 poster with a boy in a black uniform standing behind a blond man in a grey suit, under a large magenta logo',
    src: '/photos/anime4.jpg',
    width: 4,
    height: 5,
  },
  {
    title: 'Flower delivery',
    detail: 'bright colors, warm hands',
    alt: 'Colorful Chainsaw Man poster showing Denji, Power, Aki, Makima and Pochita in white shirts and ties, with the chainsaw devil behind them',
    src: '/photos/anime5.jpg',
    width: 4,
    height: 4,
  },
  {
    title: 'Anime',
    detail: 'bright colors, warm hands',
    alt: 'Black-and-white Chainsaw Man poster with the main characters standing together and the chainsaw devil looming behind them',
    src: '/photos/anime6.jpg',
    width: 4,
    height: 5,
  },
  {
    title: 'konichiwa',
    detail: 'bright colors, warm hands',
    alt: 'Black-and-white Chainsaw Man poster with the main characters standing together and the chainsaw devil looming behind them',
    src: '/photos/anime6.jpg',
    width: 4,
    height: 5,
  },
]
