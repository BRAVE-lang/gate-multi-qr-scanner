import React from 'react';
import { Scan, Sparkles, FileText, Loader2 } from 'lucide-react';

interface ScanControlsProps {
  isScanning: boolean;
  isOcrRunning: boolean;
  ocrProgressMessage?: string;
  hasResults: boolean;
  onScan: () => void;
  onEnhancedScan: () => void;
  onRunOcr: () => void;
}

export const ScanControls: React.FC<ScanControlsProps> = ({
  isScanning,
  isOcrRunning,
  ocrProgressMessage,
  hasResults,
  onScan,
  onEnhancedScan,
  onRunOcr,
}) => {
  return (
    <div className="scan-control-panel">
      <button
        type="button"
        className="btn-scan-primary"
        onClick={onScan}
        disabled={isScanning || isOcrRunning}
        id="btn-scan-page"
      >
        {isScanning ? (
          <>
            <Loader2 size={20} className="spinning" />
            <span>Scanning for QR codes...</span>
          </>
        ) : (
          <>
            <Scan size={20} />
            <span>{hasResults ? 'Re-scan Page' : 'Scan Page for QR Codes'}</span>
          </>
        )}
      </button>

      <div className="secondary-scan-options">
        <button
          type="button"
          className="btn-secondary-tool"
          onClick={onEnhancedScan}
          disabled={isScanning || isOcrRunning}
          title="Applies contrast enhancement, sharpening and high-density tile scan"
        >
          <Sparkles size={16} style={{ color: 'var(--primary)' }} />
          <span>Improve Detection / Retry</span>
        </button>

        {hasResults && (
          <button
            type="button"
            className="btn-secondary-tool"
            onClick={onRunOcr}
            disabled={isScanning || isOcrRunning}
            title="Scan printed text to match question numbers (Q1, Q2, etc.) to QR codes"
          >
            {isOcrRunning ? (
              <>
                <Loader2 size={16} className="spinning" />
                <span>{ocrProgressMessage || 'Reading text...'}</span>
              </>
            ) : (
              <>
                <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Auto-Detect Question Nos. (OCR)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
