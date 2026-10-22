import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface StatusMessageProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onDismiss?: () => void;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ type, message, onDismiss }) => {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: 'var(--danger)' }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: 'var(--primary)' }} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: 'var(--success-light)', border: 'var(--success-border)', text: '#065f46' };
      case 'warning':
        return { bg: 'var(--warning-light)', border: 'var(--warning-border)', text: '#92400e' };
      case 'error':
        return { bg: 'var(--danger-light)', border: 'var(--danger-border)', text: '#991b1b' };
      case 'info':
      default:
        return { bg: 'var(--primary-light)', border: 'var(--primary-border)', text: '#1e40af' };
    }
  };

  const colors = getColors();

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: '0.8125rem',
        lineHeight: 1.4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {getIcon()}
        <span>{message}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
          }}
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
