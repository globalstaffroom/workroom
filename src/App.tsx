import { useOrchestrator } from './hooks/useOrchestrator'
import { Room } from './components/Room'

export default function App() {
  useOrchestrator()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1a2030', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: '#111820', borderBottom: '3px solid #2a3848', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#fff', letterSpacing: 2 }}>
          WORK<span style={{ color: '#7ec850' }}>ROOM</span>
        </span>
        <span style={{ fontSize: 10, color: '#334', marginLeft: 8 }}>pixel art office</span>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
          <Room />
        </div>
        {/* FeedPanel added in Task 8 */}
        <div style={{ width: 220, background: '#111820', borderLeft: '3px solid #2a3848' }} />
      </div>
    </div>
  )
}
