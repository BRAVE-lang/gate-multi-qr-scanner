import React from 'react';
import { QrCode, History, ShieldCheck } from 'lucide-react';

interface AppHeaderProps {
  status: 'idle' | 'ready' | 'scanning' | 'ocr';
  statusMessage?: string;
  onOpenHistory?: () => void;
  historyCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  status,
  statusMessage,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-wrapper">
          <div className="brand-icon" aria-hidden="true">
            <QrCode size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="brand-title">
              GATE QR Scanner
              <span className="gate-badge">Multi-QR</span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            className={`status-badge ${status}`}
            role="status"
            aria-live="polite"
            title={statusMessage || (status === 'ready' ? 'Ready to scan' : 'Idle')}
          >
            <span className="status-dot" />
            <span>
              {status === 'scanning'
                ? 'Scanning...'
                : status === 'ocr'
                ? 'Reading text...'
                : status === 'ready'
                ? 'Ready'
                : 'Standby'}
            </span>
          </div>

          {onOpenHistory && (
            <button
              type="button"
              className="btn-secondary-tool"
              onClick={onOpenHistory}
              aria-label={`View scan history (${historyCount} saved)`}
              title="View saved scan sessions"
              style={{ padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-full)' }}
            >
              <History size={16} />
              {historyCount > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{historyCount}</span>}
            </button>
          )}
        </div>
      </div>

      <p className="header-subtitle">
        Scan one page. Extract every QR code.
      </p>
    </header>
  );
};
