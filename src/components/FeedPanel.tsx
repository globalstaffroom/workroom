import { useAgentStore } from '../store/agentStore'
import { useFeedStore } from '../store/feedStore'
import { DramaControls } from './DramaControls'
import { useOrchestrator } from '../hooks/useOrchestrator'

const AGENT_COLORS: Record<string, string> = {
  coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
}

export function FeedPanel() {
  const agents = useAgentStore(s => Object.values(s.agents))
  const dramaLevel = useAgentStore(s => s.dramaLevel)
  const setDrama = useAgentStore(s => s.setDrama)
  const entries = useFeedStore(s => s.entries)
  const { send } = useOrchestrator()

  const handleDramaChange = (level: number) => {
    setDrama(level)
    send({ type: 'set_drama', level })
  }

  return (
    <div style={{
      width: 220, background: '#111820', borderLeft: '3px solid #2a3848',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '2px solid #2a3848', fontSize: 7, color: '#7ec850', letterSpacing: 1, fontFamily: 'monospace' }}>
        ▶ ACTIVITY FEED
      </div>

      {/* Agent roster */}
      <div style={{ padding: '10px 12px', borderBottom: '2px solid #1a2030' }}>
        <div style={{ fontSize: 6, color: '#334', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// AGENTS</div>
        {agents.map(agent => {
          const color = AGENT_COLORS[agent.id] ?? '#888'
          return (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid #151d2a' }}>
              <div style={{ fontSize: 16 }}>{agent.sprite}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 7, color, marginBottom: 2, fontFamily: 'monospace' }}>{agent.id}_01</div>
                <div style={{ fontSize: 5, color: '#445', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.bubble ?? 'idle'}
                </div>
                <div style={{ height: 3, background: '#151d2a', border: '1px solid #2a3848', marginTop: 3 }}>
                  <div style={{ width: `${agent.progress}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        <div style={{ fontSize: 6, color: '#334', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>// LOG</div>
        {entries.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 6, padding: '5px 0', borderBottom: '1px solid #111820' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: entry.color, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: 6, color: entry.color, display: 'block', marginBottom: 1, fontFamily: 'monospace' }}>{entry.agentId}</span>
              <div style={{ fontSize: 5, color: '#445', lineHeight: 1.6 }}>{entry.message}</div>
              <div style={{ fontSize: 5, color: '#223', marginTop: 1 }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
