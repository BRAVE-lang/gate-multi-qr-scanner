import { DecodedQRCode } from '../types';

/**
 * Triggers a browser download of a generated blob or text
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a field for CSV according to RFC 4180
 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

export class ExportService {
  /**
   * Exports results to a clean TXT file
   */
  static exportToTxt(codes: DecodedQRCode[], pageTitle = 'GATE-QR-Results'): void {
    const timestamp = new Date().toLocaleString();
    const lines: string[] = [
      `========================================`,
      `GATE MULTI-QR SCANNER — EXPORT`,
      `Page/Session: ${pageTitle}`,
      `Exported at: ${timestamp}`,
      `Total QR Codes: ${codes.length}`,
      `========================================\n`,
    ];

    codes.forEach((code) => {
      const qPrefix = code.questionNumber ? `[${code.questionNumber}] ` : '';
      lines.push(`${code.sequenceNumber}. ${qPrefix}${code.parsedUrl || code.rawContent}`);
    });

    lines.push('\n----------------------------------------');
    lines.push('Raw Decoded Payloads:');
    codes.forEach((code) => {
      lines.push(`\n#${code.sequenceNumber}: ${code.rawContent}`);
    });

    const filename = `${pageTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}.txt`;
    downloadFile(lines.join('\n'), filename, 'text/plain');
  }

  /**
   * Exports results to a structured CSV file
   */
  static exportToCsv(codes: DecodedQRCode[], pageTitle = 'GATE-QR-Results'): void {
    const headers = [
      'Sequence',
      'Question_Number',
      'Question_Confidence',
      'Content_Type',
      'Decoded_URL_Or_Text',
      'Raw_Payload',
      'Position_X',
      'Position_Y',
      'Detection_Engine',
      'Is_Repeated_Link',
    ];

    const rows = codes.map((code) => {
      return [
        code.sequenceNumber,
        code.questionNumber || '',
        code.questionConfidence,
        code.isUrl ? 'URL' : 'Text',
        code.parsedUrl || code.rawContent,
        code.rawContent,
        code.center.x,
        code.center.y,
        code.detectedBy,
        code.isDuplicate ? 'Yes' : 'No',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `${pageTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}.csv`;
    downloadFile(csvContent, filename, 'text/csv');
  }
}
