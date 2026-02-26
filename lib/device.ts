const MOBILE_UA_REGEX = /(Mobi|Android|iPhone|iPad|iPod)/i

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return MOBILE_UA_REGEX.test(userAgent)
}

