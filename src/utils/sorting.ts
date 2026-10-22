import { DecodedQRCode } from '../types';

/**
 * Sorts detected QR codes into natural reading order:
 * Top-to-bottom, Left-to-right within rows.
 * Uses adaptive row grouping so codes at slightly varied vertical positions
 * along the same line are correctly clustered.
 * 
 * @param codes List of detected QR codes
 * @param rowTolerance Relative multiplier of average code height (default 0.55)
 */
export function sortQRCodesSpatial(
  codes: DecodedQRCode[],
  rowTolerance = 0.55
): DecodedQRCode[] {
  if (codes.length <= 1) {
    return codes.map((c, index) => ({ ...c, sequenceNumber: index + 1 }));
  }

  // Calculate average height of the codes to serve as the baseline scale
  const totalHeight = codes.reduce((sum, c) => sum + (c.boundingBox.height || 40), 0);
  const avgHeight = Math.max(20, totalHeight / codes.length);
  const verticalTolerance = avgHeight * rowTolerance;

  // Clone array and sort primarily by center Y
  const sortedByY = [...codes].sort((a, b) => a.center.y - b.center.y);

  // Group into horizontal rows
  const rows: DecodedQRCode[][] = [];
  let currentRow: DecodedQRCode[] = [];
  let currentRowY = sortedByY[0].center.y;

  for (const code of sortedByY) {
    if (currentRow.length === 0) {
      currentRow.push(code);
      currentRowY = code.center.y;
    } else {
      // Check if this code belongs to the current row
      if (Math.abs(code.center.y - currentRowY) <= verticalTolerance) {
        currentRow.push(code);
        // Update average Y of current row
        currentRowY = currentRow.reduce((sum, c) => sum + c.center.y, 0) / currentRow.length;
      } else {
        // Start a new row
        rows.push(currentRow);
        currentRow = [code];
        currentRowY = code.center.y;
      }
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Within each row, sort from Left to Right by center X
  const flattened: DecodedQRCode[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.center.x - b.center.x);
    flattened.push(...row);
  }

  // Re-assign 1-based sequential numbers
  return flattened.map((code, idx) => ({
    ...code,
    sequenceNumber: idx + 1,
  }));
}
