import { useOrchestrator } from './hooks/useOrchestrator'
import { Room } from './components/Room'
import { FeedPanel } from './components/FeedPanel'

export default function App() {
  useOrchestrator()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1a2030', overflow: 'hidden', flexDirection: 'column' }}>
      <div style={{ background: '#111820', borderBottom: '3px solid #2a3848', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#fff', letterSpacing: 2 }}>
          WORK<span style={{ color: '#7ec850' }}>ROOM</span>
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
          <Room />
        </div>
        <FeedPanel />
      </div>
    </div>
  )
}
