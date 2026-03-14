import React, { useState } from 'react';
import { useAppStore } from '../store/AppStore';

interface Props {
  onClose: () => void;
}

export function ApiKeyModal({ onClose }: Props) {
  const { state, setApiKey, showToast } = useAppStore();
  const [input, setInput] = useState(state.apiKey);
  const [validating, setValidating] = useState(false);

  async function handleSave() {
    const key = input.trim();
    if (!key) {
      showToast('⚠️ Introdu o cheie API validă!', 'error');
      return;
    }

    // Quick validation — try to hit /sports endpoint
    setValidating(true);
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports?apiKey=${key}`
      );
      if (!res.ok) {
        showToast('❌ Cheie API invalidă sau expirată.', 'error');
        setValidating(false);
        return;
      }
      setApiKey(key);
      showToast('✅ Cheie API salvată!', 'success');
      onClose();
    } catch {
      showToast('❌ Eroare de rețea. Verifică conexiunea.', 'error');
    } finally {
      setValidating(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        {/* Corner accents */}
        <span style={{ ...styles.corner, top: 0, left: 0, borderTopColor: '#c8f135', borderLeftColor: '#c8f135' }} />
        <span style={{ ...styles.corner, top: 0, right: 0, borderTopColor: '#c8f135', borderRightColor: '#c8f135' }} />
        <span style={{ ...styles.corner, bottom: 0, left: 0, borderBottomColor: '#c8f135', borderLeftColor: '#c8f135' }} />
        <span style={{ ...styles.corner, bottom: 0, right: 0, borderBottomColor: '#c8f135', borderRightColor: '#c8f135' }} />

        <div style={styles.icon}>🔑</div>
        <h2 style={styles.title}>CONFIGURARE API</h2>

        <p style={styles.desc}>
          Introdu cheia API gratuită de la{' '}
          <a href="https://the-odds-api.com" target="_blank" rel="noreferrer" style={styles.link}>
            the-odds-api.com
          </a>
          {' '}(500 cereri/lună gratuit).
        </p>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="ex: a1b2c3d4e5f6g7h8i9j0..."
          style={styles.input}
          autoFocus
        />

        <div style={styles.hint}>
          Cheia se salvează local în browser și nu este trimisă nicăieri altundeva.
        </div>

        <button
          onClick={handleSave}
          disabled={validating}
          style={{ ...styles.btnSave, opacity: validating ? 0.6 : 1 }}
        >
          {validating ? 'SE VALIDEAZĂ...' : 'SALVEAZĂ & CONECTEAZĂ'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  box: {
    background: '#0d1017',
    border: '1px solid rgba(200,241,53,0.2)',
    borderRadius: 16,
    padding: '44px 40px',
    maxWidth: 500, width: '90%',
    position: 'relative',
    textAlign: 'center',
    animation: 'modalIn 0.4s cubic-bezier(0.23,1,0.32,1)',
  },
  corner: {
    position: 'absolute',
    width: 16, height: 16,
    border: '2px solid transparent',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 34, letterSpacing: 4,
    color: '#c8f135', marginBottom: 14,
  },
  desc: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 14, color: '#8892a4',
    lineHeight: 1.7, marginBottom: 24,
  },
  link: { color: '#00e5ff', textDecoration: 'none' },
  input: {
    width: '100%',
    background: '#080a0f',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#f0f4ff',
    padding: '13px 16px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    marginBottom: 10,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.18s',
  },
  hint: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#3d4660',
    marginBottom: 24,
  },
  btnSave: {
    width: '100%',
    background: 'linear-gradient(135deg, #c8f135, #a8d400)',
    color: '#06080c',
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20, letterSpacing: 3,
    padding: '13px 0',
    border: 'none', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.18s',
  },
};
