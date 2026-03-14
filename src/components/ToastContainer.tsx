import React from 'react';
import { useAppStore } from '../store/AppStore';
import type { ToastMessage } from '../types';

export function ToastContainer() {
  const { state } = useAppStore();

  return (
    <div style={styles.container}>
      {state.toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function Toast({ toast }: { toast: ToastMessage }) {
  const icons: Record<ToastMessage['type'], string> = {
    success: '✅', error: '❌', info: 'ℹ️',
  };

  const borderColors: Record<ToastMessage['type'], string> = {
    success: 'rgba(200,241,53,0.5)',
    error: 'rgba(255,45,85,0.5)',
    info: 'rgba(0,229,255,0.5)',
  };

  return (
    <div style={{ ...styles.toast, borderColor: borderColors[toast.type] }}>
      <span style={styles.icon}>{icons[toast.type]}</span>
      <span style={styles.text}>{toast.text}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: 8,
    pointerEvents: 'none',
  },
  toast: {
    background: '#111520',
    border: '1px solid',
    borderRadius: 6,
    padding: '11px 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, color: '#f0f4ff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    animation: 'toastIn 0.3s cubic-bezier(0.23,1,0.32,1)',
    maxWidth: 320,
  },
  icon: { fontSize: 16, flexShrink: 0 },
  text: { lineHeight: 1.4 },
};
