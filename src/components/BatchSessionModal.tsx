import React, { useState } from 'react';
import { X, Trash2, Copy, Check, FileDown, Calendar, Layers } from 'lucide-react';
import { copyToClipboard } from '../services/clipboard';
import { ExportService } from '../services/exportService';
import { PageSession } from '../types';

interface BatchSessionModalProps {
  sessions: PageSession[];
  onClose: () => void;
  onSelectSession: (session: PageSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
  onRenameSession: (sessionId: string, newLabel: string) => void;
}

export const BatchSessionModal: React.FC<BatchSessionModalProps> = ({
  sessions,
  onClose,
  onSelectSession,
  onDeleteSession,
  onClearAll,
  onRenameSession,
}) => {
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleCopySessionLinks = async (session: PageSession) => {
    const text = session.results
      .map((c) => (c.questionNumber ? `${c.questionNumber} | ${c.parsedUrl || c.rawContent}` : c.parsedUrl || c.rawContent))
      .join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSessionId(session.id);
      setTimeout(() => setCopiedSessionId(null), 2000);
    }
  };

  const handleCopyAllSessions = async () => {
    const text = sessions
      .map((s) => {
        const header = `--- ${s.label} (${s.results.length} links) ---`;
        const links = s.results
          .map((c) => (c.questionNumber ? `${c.questionNumber} | ${c.parsedUrl || c.rawContent}` : c.parsedUrl || c.rawContent))
          .join('\n');
        return `${header}\n${links}`;
      })
      .join('\n\n');

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSessionId('ALL');
      setTimeout(() => setCopiedSessionId(null), 2000);
    }
  };

  const startRename = (session: PageSession) => {
    setEditingId(session.id);
    setEditLabel(session.label);
  };

  const saveRename = (sessionId: string) => {
    if (editLabel.trim()) {
      onRenameSession(sessionId, editLabel.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Scan History & Batch Sessions">
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Scan Sessions & History</h2>
          </div>

          <button type="button" className="icon-btn-compact" onClick={onClose} style={{ color: 'var(--text-main)', background: 'var(--bg-surface-subtle)' }}>
            <X size={18} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No saved scan sessions yet.</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              When you scan a book page, click &quot;Save Page&quot; to keep it in your session.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn-secondary-tool"
                onClick={handleCopyAllSessions}
                style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              >
                {copiedSessionId === 'ALL' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedSessionId === 'ALL' ? 'Copied Entire Batch!' : 'Copy All Pages in Batch'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary-tool"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all saved sessions?')) {
                    onClearAll();
                  }
                }}
                style={{ fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    background: 'var(--bg-surface-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {editingId === s.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(s.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.8125rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--primary)',
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-card-action"
                          onClick={() => saveRename(s.id)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <strong
                        onClick={() => startRename(s)}
                        style={{ cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--text-main)' }}
                        title="Click to rename"
                      >
                        {s.label}
                      </strong>
                    )}

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.results.length} QR codes
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    <Calendar size={13} />
                    <span>{new Date(s.timestamp).toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn-card-action"
                        onClick={() => handleCopySessionLinks(s)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        {copiedSessionId === s.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedSessionId === s.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-card-action"
                        onClick={() => ExportService.exportToTxt(s.results, s.label)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        title="Export TXT"
                      >
                        <FileDown size={13} />
                        <span>TXT</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn-card-action"
                        onClick={() => {
                          onSelectSession(s);
                          onClose();
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--primary)' }}
                      >
                        Load Page
                      </button>

                      <button
                        type="button"
                        className="btn-card-action"
                        onClick={() => onDeleteSession(s.id)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                        title="Delete this session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
