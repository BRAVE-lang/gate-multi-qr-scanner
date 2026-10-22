import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Edit2,
} from 'lucide-react';
import { copyToClipboard } from '../services/clipboard';
import { DecodedQRCode } from '../types';
import { getDomainFromUrl } from '../utils/urlValidation';

interface ResultCardProps {
  code: DecodedQRCode;
  index: number;
  totalCodes: number;
  onUpdateQuestionNumber: (codeId: string, newNumber: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (codeId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  code,
  index,
  totalCodes,
  onUpdateQuestionNumber,
  onMoveUp,
  onMoveDown,
  onRemove,
  isSelected = false,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingQ, setIsEditingQ] = useState(false);
  const [qInputValue, setQInputValue] = useState(code.questionNumber || '');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetText = code.parsedUrl || code.rawContent;
    const ok = await copyToClipboard(targetText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveQuestion = () => {
    onUpdateQuestionNumber(code.id, qInputValue.trim());
    setIsEditingQ(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveQuestion();
    } else if (e.key === 'Escape') {
      setQInputValue(code.questionNumber || '');
      setIsEditingQ(false);
    }
  };

  const domain = getDomainFromUrl(code.parsedUrl);

  return (
    <div
      className={`result-card ${isSelected ? 'selected' : ''} ${code.isDuplicate ? 'is-duplicate' : ''}`}
      onClick={onSelect}
      style={{
        border: isSelected ? '2px solid var(--primary)' : undefined,
      }}
    >
      <div className="card-top-row">
        <div className="seq-and-q">
          <div className="seq-badge" title={`Scan Sequence #${code.sequenceNumber}`}>
            #{code.sequenceNumber}
          </div>

          {/* Question Number Field (editable) */}
          {isEditingQ ? (
            <div className="q-label-input-wrapper">
              <input
                type="text"
                className="q-label-input"
                value={qInputValue}
                onChange={(e) => setQInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Q1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="btn-card-action"
                style={{ padding: '0.1875rem 0.375rem', fontSize: '0.75rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveQuestion();
                }}
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div
              className="q-label-input-wrapper"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingQ(true);
              }}
              style={{ cursor: 'pointer' }}
              title="Click to edit Question Number"
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: code.questionNumber ? 'var(--primary)' : 'var(--text-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {code.questionNumber || '+ Add Q#'}
                <Edit2 size={12} style={{ opacity: 0.6 }} />
              </span>

              {code.questionConfidence === 'high' && (
                <span className="q-confidence-tag high">OCR Match</span>
              )}
              {code.questionConfidence === 'review' && (
                <span className="q-confidence-tag review">Check Q#</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {code.isDuplicate && (
            <span
              className="q-confidence-tag review"
              title="Another distinct QR code on this page shares this identical content"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <AlertTriangle size={12} />
              Repeated Link
            </span>
          )}

          <span className="domain-tag" title={domain}>
            {domain}
          </span>
        </div>
      </div>

      {/* Main decoded content / URL */}
      <div className="link-content-box" onClick={(e) => e.stopPropagation()}>
        {code.parsedUrl || code.rawContent}
      </div>

      {/* Action Toolbar */}
      <div className="card-actions-bar" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button
            type="button"
            className={`btn-card-action ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            id={`copy-btn-${code.sequenceNumber}`}
            aria-label={`Copy link #${code.sequenceNumber}`}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {code.isUrl && code.parsedUrl && (
            <a
              href={code.parsedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-card-action"
              title="Open link in new tab"
              aria-label={`Open link #${code.sequenceNumber}`}
            >
              <ExternalLink size={15} />
              <span>Open</span>
            </a>
          )}
        </div>

        {/* Up/Down order correction */}
        <div className="reorder-btns-group">
          <button
            type="button"
            className="btn-reorder"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            title="Move result earlier in sequence"
            aria-label="Move up"
          >
            <ChevronUp size={16} />
          </button>

          <button
            type="button"
            className="btn-reorder"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCodes - 1}
            title="Move result later in sequence"
            aria-label="Move down"
          >
            <ChevronDown size={16} />
          </button>

          <button
            type="button"
            className="btn-reorder"
            onClick={() => onRemove(code.id)}
            title="Remove incorrect or unwanted result"
            aria-label="Remove result"
            style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
