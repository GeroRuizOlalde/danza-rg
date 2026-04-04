export const DEFAULT_CLASS_IMAGE =
  'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80'

const BROKEN_REMOTE_IMAGE_SIGNATURES = new Set([
  'images.unsplash.com/photo-1574273844924-f37e7e95fb9b',
])

export function resolveClassImageUrl(src?: string | null) {
  const normalizedSrc = src?.trim()

  if (!normalizedSrc) {
    return DEFAULT_CLASS_IMAGE
  }

  try {
    const parsedUrl = new URL(normalizedSrc)
    const signature = `${parsedUrl.hostname}${parsedUrl.pathname}`

    if (BROKEN_REMOTE_IMAGE_SIGNATURES.has(signature)) {
      return DEFAULT_CLASS_IMAGE
    }

    return normalizedSrc
  } catch {
    return DEFAULT_CLASS_IMAGE
  }
}
