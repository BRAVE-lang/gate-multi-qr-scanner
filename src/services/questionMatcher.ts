import { DecodedQRCode, DetectedTextRegion, QuestionConfidence } from '../types';

/**
 * Standard GATE examination question patterns:
 * Matches:
 * "Q1", "Q.1", "Q 1", "Q. 1", "Question 1", "Question No. 1", "Que. 1"
 * "Q. 2(a)", "Q2(b)", "Q15", "Q.24"
 */
export const QUESTION_PATTERNS = [
  /\b(?:Question|Que\.?|Q)\.?\s*(?:No\.?)?\s*([0-9]{1,3}(?:\s*\([a-z0-9]+\))?)/i,
  /\bQ([0-9]{1,3}(?:\([a-z0-9]+\))?)\b/i,
  /\b\[Q\.?\s*([0-9]{1,3})\]/i,
];

/**
 * Checks if a text string contains a GATE question number and extracts the canonical form (e.g. "Q1", "Q15")
 */
export function extractQuestionLabel(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();

  for (const regex of QUESTION_PATTERNS) {
    const match = clean.match(regex);
    if (match && match[1]) {
      // Normalize to "Q" + number e.g. "Q1" or "Q2(a)"
      const numPart = match[1].replace(/\s+/g, '');
      return `Q${numPart}`;
    }
  }

  return null;
}

/**
 * Associates detected question text regions with decoded QR codes based on spatial layout.
 * GATE books typically place the question heading above or to the left of the QR code / solution block.
 */
export function matchQuestionsToQRCodes(
  qrCodes: DecodedQRCode[],
  textRegions: DetectedTextRegion[]
): DecodedQRCode[] {
  if (qrCodes.length === 0 || textRegions.length === 0) {
    return qrCodes;
  }

  // Filter text regions to only those containing valid question patterns
  const questionLabels: Array<DetectedTextRegion & { label: string }> = [];

  for (const region of textRegions) {
    const label = extractQuestionLabel(region.text);
    if (label) {
      questionLabels.push({ ...region, label });
    }
  }

  if (questionLabels.length === 0) {
    return qrCodes;
  }

  // Map each QR code to its closest likely question label
  const usedLabels = new Set<string>();

  return qrCodes.map((qr) => {
    // If the user already confirmed or set a question number, don't overwrite
    if (qr.questionConfidence === 'confirmed' && qr.questionNumber) {
      return qr;
    }

    let bestLabel: string | null = null;
    let bestScore = Infinity;
    let confidence: QuestionConfidence = 'none';

    for (const q of questionLabels) {
      // Relative offset from question label to QR code
      const dx = qr.center.x - q.center.x;
      const dy = qr.center.y - q.center.y;

      // Question labels should appear ABOVE (dy > -20) or to the LEFT (dx > -20) of the QR code
      // We strongly penalize question labels that appear significantly BELOW the QR code (dy < -60)
      if (dy < -80) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const qrHeight = qr.boundingBox.height || 100;

      // Primary criteria: Within 3x QR code dimensions
      if (dist < qrHeight * 3.5) {
        // Preference score: strongly prefer labels directly above or directly to the left
        let alignmentBonus = 0;
        if (dy >= 0 && dy <= qrHeight * 1.5 && Math.abs(dx) < qrHeight * 1.2) {
          // Above the QR code
          alignmentBonus = -50;
        } else if (dx >= 0 && Math.abs(dy) < qrHeight * 0.8) {
          // To the left of the QR code
          alignmentBonus = -40;
        }

        const score = dist + alignmentBonus;
        if (score < bestScore) {
          bestScore = score;
          bestLabel = q.label;
          confidence = score < qrHeight * 1.5 ? 'high' : 'review';
        }
      }
    }

    if (bestLabel) {
      usedLabels.add(bestLabel);
      return {
        ...qr,
        questionNumber: bestLabel,
        questionConfidence: confidence,
      };
    }

    return {
      ...qr,
      questionConfidence: 'none',
    };
  });
}
