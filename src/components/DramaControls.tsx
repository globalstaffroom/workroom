const DRAMA_LABEL = (n: number) =>
  n <= 20 ? 'CHILL' : n <= 40 ? 'NORMAL' : n <= 60 ? 'SPICY' : n <= 80 ? 'HOT' : 'CHAOS'

const DRAMA_COLOR = (n: number) =>
  n <= 20 ? '#58a6ff' : n <= 40 ? '#7ec850' : n <= 60 ? '#f0c040' : n <= 80 ? '#f08030' : '#e04040'

interface Props {
  dramaLevel: number
  onDramaChange: (level: number) => void
  onChaos: () => void
}

export function DramaControls({ dramaLevel, onDramaChange, onChaos }: Props) {
  const color = DRAMA_COLOR(dramaLevel)
  return (
    <div style={{ padding: '10px 12px', borderBottom: '2px solid #1a2030' }}>
      <div style={{ fontSize: 7, color: '#334', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// DRAMA</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input
          type="range" min={0} max={100} value={dramaLevel}
          onChange={e => onDramaChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: color }}
        />
        <span style={{ fontSize: 7, color, width: 46, textAlign: 'right', fontFamily: 'monospace', letterSpacing: 0.5 }}>
          {DRAMA_LABEL(dramaLevel)}
        </span>
      </div>
      <button
        onClick={onChaos}
        style={{
          width: '100%', padding: '7px 0',
          background: '#3a0808', border: '2px solid #e04040', borderBottom: '4px solid #800',
          color: '#e04040', fontSize: 7, cursor: 'pointer',
          fontFamily: 'monospace', letterSpacing: 1,
        }}
      >
        STIR THE POT
      </button>
    </div>
  )
}
