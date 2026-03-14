import React from 'react';
import { extractOdds } from '../services/api';
import type { Match, OddsStats } from '../types';

interface Props {
  matches: Match[];
  stats: OddsStats | null;
}

export function RightSidebar({ matches, stats }: Props) {
  const featured = [...matches]
    .filter(m => extractOdds(m).home !== null)
    .sort((a, b) => (extractOdds(b).home ?? 0) - (extractOdds(a).home ?? 0))
    .slice(0, 3);

  return (
    <aside style={styles.aside}>
      {/* Featured bets */}
      <div style={styles.label}>🔥 TOP COTE</div>
      <div style={styles.featuredList}>
        {featured.length === 0 && (
          <p style={styles.empty}>Încarcă cote pentru a vedea topul</p>
        )}
        {featured.map(m => {
          const o = extractOdds(m);
          return (
            <div key={m.id} style={styles.featuredCard}>
              <div style={styles.featuredBar} />
              <div style={styles.featuredMatch}>{m.home_team} vs {m.away_team}</div>
              <div style={styles.featuredPick}>Victorie {m.home_team}</div>
              <div style={styles.featuredOdd}>{o.home?.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={styles.statsBlock}>
        <div style={styles.label}>📊 STATISTICI</div>
        <div style={styles.statsList}>
          <StatRow label="Meciuri" value={stats ? String(stats.count) : '—'} />
          <StatRow label="Cotă min" value={stats?.min ?? '—'} />
          <StatRow label="Cotă max" value={stats?.max ?? '—'} />
          <StatRow label="Cotă medie" value={stats?.avg ?? '—'} />
        </div>
      </div>

      {/* Promo */}
      <div style={styles.promo}>
        <div style={styles.promoBadge}>BONUS</div>
        <div style={styles.promoTitle}>100% până la<br />500 RON</div>
        <div style={styles.promoText}>La primul depozit · 18+ · Joacă responsabil</div>
        <button style={styles.promoBtn}>REVENDICĂ ACUM</button>
      </div>
    </aside>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={statStyles.row}>
      <span style={statStyles.label}>{label}</span>
      <span style={statStyles.value}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  aside: {
    display: 'flex', flexDirection: 'column', gap: 14,
    position: 'sticky', top: 104, alignSelf: 'start',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: 3, color: '#3d4660',
  },
  featuredList: { display: 'flex', flexDirection: 'column', gap: 6 },
  empty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#252c40',
  },
  featuredCard: {
    background: '#111520',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6, padding: '12px 12px 12px 16px',
    position: 'relative', overflow: 'hidden',
    cursor: 'pointer', transition: 'border-color 0.16s',
  },
  featuredBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, background: '#c8f135',
  },
  featuredMatch: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12, fontWeight: 700, color: '#f0f4ff', marginBottom: 4,
  },
  featuredPick: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#8892a4', marginBottom: 6,
  },
  featuredOdd: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 26, color: '#c8f135',
  },
  statsBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  statsList: {
    background: '#111520',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6, padding: 12,
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  promo: {
    background: 'linear-gradient(135deg, #1a0a00, #0d1017)',
    border: '1px solid rgba(255,107,43,0.25)',
    borderRadius: 12, padding: 20,
  },
  promoBadge: {
    display: 'inline-block',
    background: '#ff6b2b', color: '#fff',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: 2,
    padding: '3px 8px', borderRadius: 2, marginBottom: 8,
  },
  promoTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 26, letterSpacing: 1, color: '#f0f4ff',
    marginBottom: 8, lineHeight: 1.1,
  },
  promoText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, color: '#3d4660', marginBottom: 14,
  },
  promoBtn: {
    background: '#ff6b2b', color: '#fff',
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16, letterSpacing: 2,
    padding: '8px 18px', border: 'none',
    borderRadius: 6, cursor: 'pointer',
    transition: 'all 0.16s',
  },
};

const statStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#8892a4',
  },
  value: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, color: '#00e5ff', fontWeight: 700,
  },
};
