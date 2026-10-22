import { CopyMode, DecodedQRCode } from '../types';

/**
 * Copies text to the clipboard with full fallback support for environments
 * where navigator.clipboard might be restricted (non-HTTPS, older Android WebViews).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Try modern navigator.clipboard API first
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: document.execCommand with hidden textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Prevent scrolling to bottom of page
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard fallback failed:', err);
    return false;
  }
}

/**
 * Formats a list of decoded QR results based on the chosen CopyMode.
 */
export function formatCopyOutput(codes: DecodedQRCode[], mode: CopyMode): string {
  if (!codes || codes.length === 0) return '';

  return codes
    .map((code) => {
      const content = code.parsedUrl || code.rawContent;

      switch (mode) {
        case 'question-mapping':
          if (code.questionNumber) {
            return `${code.questionNumber} | ${content}`;
          }
          return content;

        case 'numbered-links':
          return `${code.sequenceNumber}. ${content}`;

        case 'raw-all':
          return code.rawContent;

        case 'urls-only':
        default:
          return content;
      }
    })
    .join('\n');
}
