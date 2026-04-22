import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '../store/agentStore'
import { useFeedStore } from '../store/feedStore'
import { DramaControls } from './DramaControls'
import { send } from '../hooks/useOrchestrator'

const AGENT_COLORS: Record<string, string> = {
  coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
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
      width: 240, background: '#111820', borderLeft: '3px solid #2a3848',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '2px solid #2a3848', fontSize: 11, color: '#7ec850', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
        ▶ ACTIVITY FEED
      </div>

      {/* Agent roster */}
      <div style={{ padding: '10px 14px', borderBottom: '2px solid #1a2030' }}>
        <div style={{ fontSize: 10, color: '#556', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// AGENTS</div>
        {agents.map(agent => {
          const color = AGENT_COLORS[agent.id] ?? '#888'
          return (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a2535' }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>{agent.sprite}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color, marginBottom: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>{agent.name}</div>
                <div style={{ fontSize: 10, color: '#778', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.bubble ?? STATUS_LABELS[agent.status] ?? 'idle'}
                </div>
                <div style={{ height: 4, background: '#1a2535', border: '1px solid #2a3848', marginTop: 4, borderRadius: 2 }}>
                  <div style={{ width: `${agent.progress}%`, height: '100%', background: color, transition: 'width 0.3s', borderRadius: 2 }} />
                </div>
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
        <div style={{ fontSize: 10, color: '#556', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// LOG</div>
        {entries.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #151d2a' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color, flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: 10, color: entry.color, display: 'block', marginBottom: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>{entry.agentId}</span>
              <div style={{ fontSize: 11, color: '#99a', lineHeight: 1.5 }}>{entry.message}</div>
              <div style={{ fontSize: 10, color: '#445', marginTop: 2 }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
