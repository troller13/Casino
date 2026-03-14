import React from 'react';
import { SPORT_OPTIONS } from '../services/config';

interface Props {
  active: string;
  onChange: (key: string) => void;
}

export function SportSidebar({ active, onChange }: Props) {
  return (
    <div style={styles.wrap}>
      <div style={styles.label}>SPORTURI</div>
      <div style={styles.list}>
        {SPORT_OPTIONS.map(sport => {
          const isActive = sport.key === active;
          return (
            <button
              key={sport.key}
              onClick={() => onChange(sport.key)}
              style={{
                ...styles.btn,
                ...(isActive ? styles.btnActive : {}),
              }}
            >
              <span style={styles.icon}>{sport.icon}</span>
              <span style={styles.name}>{sport.label}</span>
              {isActive && <span style={styles.activePip} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: 3, color: '#3d4660',
    marginBottom: 4,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 3 },
  btn: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 14px',
    background: '#111520',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    color: '#8892a4',
    fontFamily: "'Syne', sans-serif",
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.16s ease',
    position: 'relative',
  },
  btnActive: {
    background: 'linear-gradient(135deg, rgba(200,241,53,0.12), rgba(200,241,53,0.03))',
    borderColor: '#c8f135',
    color: '#c8f135',
  },
  icon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  name: { flex: 1 },
  activePip: {
    width: 6, height: 6,
    borderRadius: '50%',
    background: '#c8f135',
    boxShadow: '0 0 6px #c8f135',
    flexShrink: 0,
  },
};
