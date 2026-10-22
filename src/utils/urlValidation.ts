/**
 * Validates whether a decoded string is a safe, valid web URL.
 * Preserves the exact URL without rewriting or executing it.
 */
export function validateUrl(rawText: string): { isUrl: boolean; parsedUrl: string | null } {
  if (!rawText || typeof rawText !== 'string') {
    return { isUrl: false, parsedUrl: null };
  }

  const trimmed = rawText.trim();

  // Guard against dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { isUrl: false, parsedUrl: null };
  }

  try {
    // Check if it parses as a standard URL with http or https protocol
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { isUrl: true, parsedUrl: trimmed };
    }
  } catch {
    // Check if it's a domain-like string (e.g. www.gateacademy.co.in/q1 or youtube.com/watch?v=...)
    const domainRegex = /^(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/i;
    if (domainRegex.test(trimmed) && (trimmed.includes('.') || trimmed.startsWith('http'))) {
      const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
        ? trimmed 
        : `https://${trimmed}`;
      try {
        new URL(normalized);
        return { isUrl: true, parsedUrl: normalized };
      } catch {
        return { isUrl: false, parsedUrl: null };
      }
    }
  }

  return { isUrl: false, parsedUrl: null };
}

/**
 * Returns a clean domain badge or fallback label.
 */
export function getDomainFromUrl(url: string | null): string {
  if (!url) return 'Plain Text';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Web Link';
  }
}
