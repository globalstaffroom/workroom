import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '../store/agentStore'
import { useFeedStore } from '../store/feedStore'
import { DramaControls } from './DramaControls'
import { send } from '../hooks/useOrchestrator'

const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#40e0d0']

function hashCode(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + (c.codePointAt(0) ?? 0)) | 0
  return Math.abs(h)
}

function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}

const STATUS_COLORS: Record<string, string> = {
  working: '#58a6ff', idle: '#7ec850', waiting: '#f0c040', reacting: '#cc88ff', offline: '#444',
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'idle', working: 'working…', waiting: 'waiting', reacting: 'reacting', offline: 'offline',
}

export function FeedPanel() {
  const agents = useAgentStore(useShallow(s => Object.values(s.agents)))
  const dramaLevel = useAgentStore(s => s.dramaLevel)
  const setDrama = useAgentStore(s => s.setDrama)
  const entries = useFeedStore(s => s.entries)

  const handleDramaChange = (level: number) => {
    setDrama(level)
    send({ type: 'set_drama', level })
  }

  return (
    <div style={{
      width: 290, background: '#111820', borderLeft: '3px solid #2a3848',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '2px solid #2a3848', fontSize: 11, color: '#7ec850', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
        ▶ ACTIVITY FEED
      </div>

      {/* Agent roster — compact: dot + name + status only */}
      <div style={{ padding: '8px 14px', borderBottom: '2px solid #1a2030' }}>
        <div style={{ fontSize: 11, color: '#778', letterSpacing: 1, marginBottom: 6, fontFamily: 'monospace' }}>// AGENTS</div>
        {agents.map(agent => {
          const color = agentColor(agent.id)
          const dotColor = STATUS_COLORS[agent.status] ?? '#444'
          return (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{agent.sprite}</div>
              <div style={{ fontSize: 12, color, fontFamily: 'monospace', fontWeight: 'bold', minWidth: 52 }}>{agent.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: `0 0 4px ${dotColor}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#99a', fontFamily: 'monospace' }}>
                  {agent.bubble ?? STATUS_LABELS[agent.status] ?? 'idle'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Drama controls */}
      <DramaControls
        dramaLevel={dramaLevel}
        onDramaChange={handleDramaChange}
        onChaos={() => send({ type: 'fire_chaos' })}
      />

      {/* Activity log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: '#778', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// LOG</div>
        {entries.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a2535' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color, flexShrink: 0, marginTop: 5 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: entry.color, display: 'block', marginBottom: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>{entry.agentId}</span>
              <div style={{ fontSize: 12, color: '#bbc', lineHeight: 1.5, wordBreak: 'break-word' }}>{entry.message}</div>
              <div style={{ fontSize: 10, color: '#667', marginTop: 3 }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
