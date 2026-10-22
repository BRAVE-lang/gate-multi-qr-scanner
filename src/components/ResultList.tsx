import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Filter,
  Layers,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { copyToClipboard, formatCopyOutput } from '../services/clipboard';
import { ExportService } from '../services/exportService';
import { CopyMode, DecodedQRCode } from '../types';
import { ResultCard } from './ResultCard';

interface ResultListProps {
  results: DecodedQRCode[];
  onUpdateQuestionNumber: (codeId: string, newNumber: string) => void;
  onReorder: (newResults: DecodedQRCode[]) => void;
  onRemove: (codeId: string) => void;
  onSaveToBatch?: () => void;
  selectedCodeId?: string;
  onSelectCode?: (codeId: string) => void;
  pageLabel?: string;
}

export const ResultList: React.FC<ResultListProps> = ({
  results,
  onUpdateQuestionNumber,
  onReorder,
  onRemove,
  onSaveToBatch,
  selectedCodeId,
  onSelectCode,
  pageLabel = 'GATE Book Page',
}) => {
  const [copyMode, setCopyMode] = useState<CopyMode>('urls-only');
  const [copiedAll, setCopiedAll] = useState(false);
  const [hideRepeated, setHideRepeated] = useState(false);

  // Filter if hideRepeated is enabled
  const displayedResults = hideRepeated
    ? results.filter((c) => !c.isDuplicate)
    : results;

  const handleCopyAll = async () => {
    const formatted = formatCopyOutput(displayedResults, copyMode);
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...results];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    // Re-index sequence numbers
    const updated = reordered.map((c, i) => ({ ...c, sequenceNumber: i + 1 }));
    onReorder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= results.length - 1) return;
    const reordered = [...results];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    // Re-index sequence numbers
    const updated = reordered.map((c, i) => ({ ...c, sequenceNumber: i + 1 }));
    onReorder(updated);
  };

  const handleExportTxt = () => {
    ExportService.exportToTxt(displayedResults, pageLabel);
  };

  const handleExportCsv = () => {
    ExportService.exportToCsv(displayedResults, pageLabel);
  };

  if (results.length === 0) return null;

  return (
    <div className="results-container" id="results-section">
      <div className="results-header-bar">
        <div className="results-count-title">
          <span>Decoded Results</span>
          <span className="results-count-badge">
            {displayedResults.length} {displayedResults.length === 1 ? 'QR code' : 'QR codes'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {results.some((c) => c.isDuplicate) && (
            <button
              type="button"
              className="btn-secondary-tool"
              onClick={() => setHideRepeated((prev) => !prev)}
              style={{
                fontSize: '0.75rem',
                padding: '0.3125rem 0.5rem',
                background: hideRepeated ? 'var(--primary-light)' : undefined,
                borderColor: hideRepeated ? 'var(--primary-border)' : undefined,
              }}
            >
              <Filter size={13} />
              <span>{hideRepeated ? 'Showing Unique' : 'Hide Repeated'}</span>
            </button>
          )}

          {onSaveToBatch && (
            <button
              type="button"
              className="btn-secondary-tool"
              onClick={onSaveToBatch}
              title="Save this page into the batch session"
              style={{ fontSize: '0.75rem', padding: '0.3125rem 0.5rem' }}
            >
              <Layers size={13} />
              <span>Save Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Copy Card */}
      <div className="bulk-copy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Bulk Copy Format:
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            One link per line
          </span>
        </div>

        <div className="copy-mode-selector" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={copyMode === 'urls-only'}
            className={`mode-tab-btn ${copyMode === 'urls-only' ? 'active' : ''}`}
            onClick={() => setCopyMode('urls-only')}
          >
            URLs Only
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={copyMode === 'question-mapping'}
            className={`mode-tab-btn ${copyMode === 'question-mapping' ? 'active' : ''}`}
            onClick={() => setCopyMode('question-mapping')}
          >
            Q-Number Map
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={copyMode === 'numbered-links'}
            className={`mode-tab-btn ${copyMode === 'numbered-links' ? 'active' : ''}`}
            onClick={() => setCopyMode('numbered-links')}
          >
            Numbered List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={copyMode === 'raw-all'}
            className={`mode-tab-btn ${copyMode === 'raw-all' ? 'active' : ''}`}
            onClick={() => setCopyMode('raw-all')}
          >
            Raw Payloads
          </button>
        </div>

        <div className="copy-actions-row">
          <button
            type="button"
            className={`btn-copy-all ${copiedAll ? 'copied' : ''}`}
            onClick={handleCopyAll}
            id="btn-copy-all"
            aria-label="Copy all extracted links to clipboard"
          >
            {copiedAll ? <Check size={18} /> : <Copy size={18} />}
            <span>{copiedAll ? 'All Copied to Clipboard!' : 'Copy All Extracted Links'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary-tool"
            onClick={handleExportTxt}
            title="Download plain text file"
            style={{ padding: '0.625rem 0.75rem', background: 'white' }}
          >
            <FileText size={16} />
            <span>TXT</span>
          </button>

          <button
            type="button"
            className="btn-secondary-tool"
            onClick={handleExportCsv}
            title="Download structured CSV spreadsheet"
            style={{ padding: '0.625rem 0.75rem', background: 'white' }}
          >
            <FileSpreadsheet size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div className="cards-list">
        {displayedResults.map((code, idx) => (
          <ResultCard
            key={code.id}
            code={code}
            index={idx}
            totalCodes={displayedResults.length}
            onUpdateQuestionNumber={onUpdateQuestionNumber}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={onRemove}
            isSelected={selectedCodeId === code.id}
            onSelect={() => onSelectCode?.(code.id)}
          />
        ))}
      </div>
    </div>
  );
};
