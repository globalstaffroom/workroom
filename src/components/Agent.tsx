import type { AgentState } from '../types'

const STATUS_COLORS: Record<string, string> = {
  working:  '#58a6ff',
  idle:     '#7ec850',
  waiting:  '#f0c040',
  offline:  '#444',
  reacting: '#cc88ff',
}

interface Props { agent: AgentState; onClick?: () => void; style?: React.CSSProperties }

export function Agent({ agent, onClick, style }: Props) {
  const dotColor = STATUS_COLORS[agent.status] ?? '#444'

  return (
    <div
      style={{ position: 'absolute', textAlign: 'center', cursor: 'pointer', userSelect: 'none', zIndex: 50, ...style }}
      onClick={onClick}
    >
      {agent.bubble && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: '#0d1520',
          border: '2px solid #4a6080', padding: '6px 10px',
          fontSize: 11, color: '#ccd', whiteSpace: 'nowrap',
          fontFamily: 'monospace', zIndex: 100,
          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          {agent.bubble}
          <div style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #4a6080',
          }} />
        </div>
      )}
      <span style={{ fontSize: 40, lineHeight: 1, display: 'block', filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.4))' }}>
        {agent.sprite}
      </span>
      <div style={{ fontSize: 11, marginTop: 3, color: '#fff', textShadow: '1px 1px 0 #000, -1px 1px 0 #000', fontFamily: 'monospace', fontWeight: 'bold' }}>
        <span className="status-dot" style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 5px ${dotColor}`,
          verticalAlign: 'middle', marginRight: 3,
        }} />
        {agent.name}
      </div>
    </div>
  )
}
