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
      className="agent"
      style={{ position: 'absolute', textAlign: 'center', cursor: 'pointer', userSelect: 'none', zIndex: 50, ...style }}
      onClick={onClick}
    >
      {agent.bubble && (
        <div className="bubble" style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
          transform: 'translateX(-50%)', background: '#111820',
          border: '2px solid #3a4858', padding: '4px 7px',
          fontSize: '9px', color: '#aab', whiteSpace: 'nowrap',
          fontFamily: 'monospace', zIndex: 100,
          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {agent.bubble}
        </div>
      )}
      <span style={{ fontSize: 28, lineHeight: 1, display: 'block', filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.3))' }}>
        {agent.sprite}
      </span>
      <div style={{ fontSize: 8, marginTop: 2, color: '#fff', textShadow: '1px 1px 0 #000', fontFamily: 'monospace' }}>
        <span className="status-dot" style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 4px ${dotColor}`,
          verticalAlign: 'middle', marginRight: 2,
        }} />
        {agent.name}
      </div>
    </div>
  )
}
