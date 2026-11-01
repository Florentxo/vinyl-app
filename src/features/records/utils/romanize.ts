// Only used to order records: what is displayed always stays as stored.
export type Romanizer = (text: string) => string

const NON_LATIN = /[\u1100-\u11ff\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/
const LATIN_LETTER = /\p{Script=Latin}/u

export function needsRomanization(text: string): boolean {
  return NON_LATIN.test(text)
}

// Discogs lists foreign releases as "Latin title = original title": the Latin part is the natural sort key.
export function latinTitlePart(text: string): string | null {
  if (!text.includes(" = ")) return null
  return text.split(" = ").map((part) => part.trim()).find((part) => LATIN_LETTER.test(part)) ?? null
}

const HANGUL_INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
const HANGUL_VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
const HANGUL_FINALS = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lp", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]

// Revised Romanization without sound-change rules: enough to give Korean text a stable alphabetical position.
export function romanizeHangul(text: string): string {
  return text.replace(/[\uac00-\ud7a3]/g, (syllable) => {
    const index = syllable.charCodeAt(0) - 0xac00
    return HANGUL_INITIALS[Math.floor(index / 588)] + HANGUL_VOWELS[Math.floor((index % 588) / 28)] + HANGUL_FINALS[index % 28]
  })
}

// Kana through wanakana, Han characters through pinyin (a Japanese kanji gets its Chinese reading, which still
// groups and orders the text consistently). The libraries are large, so they are loaded only when needed.
export async function loadRomanizer(): Promise<Romanizer> {
  const [{ toRomaji }, { pinyin }] = await Promise.all([import("wanakana"), import("pinyin-pro")])
  return (text) => {
    const kana = toRomaji(romanizeHangul(text))
    return pinyin(kana, { toneType: "none", nonZh: "consecutive" })
  }
}

export function sortKey(text: string, romanize?: Romanizer | null): string {
  const latin = latinTitlePart(text)
  const value = latin ?? text
  if (!needsRomanization(value)) return latin ?? text
  if (!romanize) return value
  return romanize(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}
