import React from 'react';

interface Props {
  stake: number;
  totalOdds: number;
  potentialWin: number;
  onClose: () => void;
}

export function BetPlacedModal({ stake, totalOdds, potentialWin, onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.box}>
        <div style={styles.icon}>🎉</div>
        <h2 style={styles.title}>PARIU PLASAT!</h2>
        <div style={styles.body}>
          <Row label="Sumă pariată" value={`${stake.toFixed(2)} RON`} />
          <Row label="Cotă totală" value={totalOdds.toFixed(2)} highlight />
          <Row
            label="Câștig potențial"
            value={`${potentialWin.toFixed(2)} RON`}
            gold
          />
        </div>
        <button onClick={onClose} style={styles.closeBtn}>ÎNCHIDE</button>
      </div>
    </div>
  );
}

function Row({
  label, value, highlight, gold,
}: {
  label: string; value: string; highlight?: boolean; gold?: boolean;
}) {
  return (
    <div style={rowStyles.row}>
      <span style={rowStyles.label}>{label}</span>
      <span style={{
        ...rowStyles.value,
        ...(highlight ? { color: '#c8f135' } : {}),
        ...(gold ? { color: '#ffd23f', fontSize: 18 } : {}),
      }}>
        {value}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9500,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  box: {
    background: '#111520',
    border: '1px solid rgba(200,241,53,0.25)',
    borderRadius: 16, padding: '44px 40px',
    maxWidth: 400, width: '90%',
    textAlign: 'center',
    animation: 'modalIn 0.4s cubic-bezier(0.23,1,0.32,1)',
  },
  icon: { fontSize: 60, marginBottom: 16 },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 36, letterSpacing: 4, color: '#c8f135', marginBottom: 24,
  },
  body: {
    background: '#0d1017', borderRadius: 8, padding: 16,
    marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 0,
  },
  closeBtn: {
    background: 'linear-gradient(135deg, #c8f135, #a8d400)',
    color: '#06080c',
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20, letterSpacing: 3,
    padding: '11px 36px', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
};

const rowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: '#8892a4',
  },
  value: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20, color: '#f0f4ff', letterSpacing: 0.5,
  },
};
