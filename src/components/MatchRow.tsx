import React from 'react';
import { extractOdds } from '../services/api';
import { useAppStore } from '../store/AppStore';
import type { Match, PickLabel } from '../types';

interface Props {
  match: Match;
  animDelay?: number;
}

export function MatchRow({ match, animDelay = 0 }: Props) {
  const { state, toggleSelection, showToast } = useAppStore();
  const odds = extractOdds(match);

  const isSelected = (label: PickLabel) =>
    state.selections.some(s => s.id === `${match.id}_${label}`);

  const handlePick = (label: PickLabel, pick: string, odd: number | null) => {
    if (!odd) return;
    const id = `${match.id}_${label}`;
    const wasSelected = state.selections.some(s => s.id === id);
    toggleSelection({
      id,
      matchId: match.id,
      matchLabel: `${match.home_team} vs ${match.away_team}`,
      pick,
      pickLabel: label,
      odd,
    });
    if (!wasSelected) {
      showToast(`✅ ${pick} adăugat`, 'success');
    }
  };

  const date = new Date(match.commence_time);
  const dateStr = date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
  const timeStr = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        ...styles.row,
        animationDelay: `${animDelay}ms`,
      }}
    >
      {/* Teams */}
      <div style={styles.teams}>
        <span style={styles.team}>{match.home_team}</span>
        <span style={styles.vs}>vs</span>
        <span style={styles.team}>{match.away_team}</span>
      </div>

      {/* Time */}
      <div style={styles.timeCol}>
        <span style={styles.dateStr}>{dateStr}</span>
        <span style={styles.timeStr}>{timeStr}</span>
      </div>

      {/* Odds: 1, X, 2 */}
      <OddButton
        label="1"
        pick={match.home_team}
        odd={odds.home}
        selected={isSelected('1')}
        onClick={() => handlePick('1', match.home_team, odds.home)}
      />
      <OddButton
        label="X"
        pick="Egal"
        odd={odds.draw}
        selected={isSelected('X')}
        onClick={() => handlePick('X', 'Egal', odds.draw)}
      />
      <OddButton
        label="2"
        pick={match.away_team}
        odd={odds.away}
        selected={isSelected('2')}
        onClick={() => handlePick('2', match.away_team, odds.away)}
      />
    </div>
  );
}

interface OddBtnProps {
  label: string;
  pick: string;
  odd: number | null;
  selected: boolean;
  onClick: () => void;
}

function OddButton({ label, odd, selected, onClick }: OddBtnProps) {
  if (!odd) {
    return <div style={styles.oddNA}>—</div>;
  }

  return (
    <button
      onClick={onClick}
      style={{
        ...styles.oddBtn,
        ...(selected ? styles.oddBtnSelected : {}),
      }}
    >
      <span style={styles.oddLabel}>{label}</span>
      <span style={{ ...styles.oddVal, ...(selected ? styles.oddValSelected : {}) }}>
        {odd.toFixed(2)}
      </span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 110px 70px 70px 70px',
    gap: 8,
    alignItems: 'center',
    background: '#111520',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: '14px 16px',
    transition: 'all 0.16s ease',
    animation: 'fadeInUp 0.4s ease both',
  },
  teams: {
    display: 'flex', flexDirection: 'column', gap: 3,
    minWidth: 0,
  },
  team: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 13, fontWeight: 700, color: '#f0f4ff',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  vs: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, color: '#3d4660', letterSpacing: 1,
  },
  timeCol: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2,
    fontFamily: "'JetBrains Mono', monospace",
  },
  dateStr: { fontSize: 11, color: '#8892a4' },
  timeStr: { fontSize: 10, color: '#3d4660' },
  oddBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: '#0d1017',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: '9px 4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  oddBtnSelected: {
    borderColor: '#c8f135',
    background: 'rgba(200,241,53,0.12)',
    boxShadow: '0 0 12px rgba(200,241,53,0.18)',
  },
  oddLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, color: '#3d4660', letterSpacing: 1,
  },
  oddVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20, color: '#f0f4ff', letterSpacing: 0.5,
    transition: 'color 0.15s',
  },
  oddValSelected: { color: '#c8f135' },
  oddNA: {
    textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, color: '#252c40',
    padding: '9px 4px',
  },
};
