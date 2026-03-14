import React, { useState } from 'react';
import { useAppStore } from '../store/AppStore';

interface Props {
  onBetPlaced: (stake: number, totalOdds: number, win: number) => void;
}

export function BetSlip({ onBetPlaced }: Props) {
  const { state, removeSelection, clearSelections, placeBet, totalOdds, potentialWin, showToast } = useAppStore();
  const [stake, setStake] = useState('');

  const stakeNum = parseFloat(stake) || 0;
  const win = potentialWin(stakeNum);

  function handlePlaceBet() {
    if (!state.selections.length) {
      showToast('⚠️ Adaugă cel puțin o selecție!', 'error');
      return;
    }
    if (stakeNum < 1) {
      showToast('⚠️ Suma minimă este 1 RON!', 'error');
      return;
    }
    if (stakeNum > state.balance) {
      showToast('❌ Sold insuficient!', 'error');
      return;
    }
    placeBet(stakeNum);
    onBetPlaced(stakeNum, totalOdds, win);
    setStake('');
  }

  const hasSelections = state.selections.length > 0;

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>🎯 BILET PARIU</span>
        <span style={styles.count}>{state.selections.length}</span>
      </div>

      {/* Selections */}
      <div style={styles.items}>
        {!hasSelections && (
          <p style={styles.empty}>Selectează cote pentru a construi biletul</p>
        )}

        {state.selections.map(sel => (
          <div key={sel.id} style={styles.selItem}>
            <div style={styles.selMatch}>{sel.matchLabel}</div>
            <div style={styles.selRow}>
              <span style={styles.selPick}>{sel.pick}</span>
              <span style={styles.selOdd}>{sel.odd.toFixed(2)}</span>
              <button
                onClick={() => removeSelection(sel.id)}
                style={styles.removeBtn}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {hasSelections && (
        <div style={styles.footer}>
          <div style={styles.footerRow}>
            <span style={styles.footerLabel}>Cotă totală</span>
            <span style={styles.totalOdds}>{totalOdds.toFixed(2)}</span>
          </div>

          <input
            type="number"
            value={stake}
            onChange={e => setStake(e.target.value)}
            placeholder="Sumă (RON)"
            min={1}
            style={styles.stakeInput}
          />

          {stakeNum > 0 && (
            <div style={{ ...styles.footerRow, marginTop: 4 }}>
              <span style={styles.footerLabel}>Câștig potențial</span>
              <span style={styles.potWin}>{win.toFixed(2)} RON</span>
            </div>
          )}

          <button onClick={handlePlaceBet} style={styles.btnPlace}>
            PLASEAZĂ PARIUL
          </button>

          <button onClick={clearSelections} style={styles.btnClear}>
            Golește biletul
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#111520',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, overflow: 'hidden',
    marginTop: 8,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, rgba(200,241,53,0.1), transparent)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18, letterSpacing: 1, color: '#f0f4ff',
  },
  count: {
    background: '#c8f135', color: '#06080c',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 700,
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  items: {
    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
    minHeight: 80,
  },
  empty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: '#3d4660',
    textAlign: 'center', padding: '16px 0',
  },
  selItem: {
    background: '#0d1017',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6, padding: '10px 12px',
    animation: 'fadeInUp 0.25s ease',
  },
  selMatch: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11, fontWeight: 700, color: '#f0f4ff',
    marginBottom: 6, paddingRight: 8,
  },
  selRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  selPick: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#8892a4', flex: 1,
  },
  selOdd: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20, color: '#c8f135', letterSpacing: 0.5, marginRight: 10,
  },
  removeBtn: {
    width: 18, height: 18, borderRadius: '50%',
    background: '#ff2d55', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, opacity: 0.8, transition: 'opacity 0.15s',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
  },
  footerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  footerLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#8892a4',
  },
  totalOdds: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 24, color: '#c8f135',
  },
  potWin: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, color: '#ffd23f', fontWeight: 700,
  },
  stakeInput: {
    width: '100%',
    background: '#080a0f',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, color: '#f0f4ff',
    padding: '10px 12px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  },
  btnPlace: {
    width: '100%',
    background: 'linear-gradient(135deg, #c8f135, #a8d400)',
    color: '#06080c',
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 19, letterSpacing: 2,
    padding: 12, border: 'none', borderRadius: 6,
    cursor: 'pointer', transition: 'all 0.16s',
  },
  btnClear: {
    background: 'none', border: 'none',
    color: '#3d4660',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, cursor: 'pointer',
    textAlign: 'center', transition: 'color 0.15s',
  },
};
