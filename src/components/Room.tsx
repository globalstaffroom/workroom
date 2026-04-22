import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '../store/agentStore'
import { Agent } from './Agent'
import type { Zone } from '../types'
import { dynamicPos } from '../utils/agentUtils'

// Zone pixel positions per agent — where each agent stands in each zone
const ZONE_POSITIONS: Record<Zone, Record<string, { top: number; left: number }>> = {
  work_area:    {
    coder:  { top: 100, left: 60 },
    tester: { top: 100, left: 180 },
    review: { top: 100, left: 120 },
    search: { top: 100, left: 140 },
  },
  lounge:       {
    coder:  { top: 80, left: 460 },
    tester: { top: 80, left: 500 },
    review: { top: 80, left: 540 },
    search: { top: 70, left: 520 },
  },
  copy_room:    {
    coder:  { top: 300, left: 80 },
    tester: { top: 300, left: 140 },
    review: { top: 290, left: 110 },
    search: { top: 300, left: 60 },
  },
  meeting_room: {
    coder:  { top: 310, left: 410 },
    tester: { top: 310, left: 470 },
    review: { top: 310, left: 530 },
    search: { top: 280, left: 450 },
  },
}


export function Room() {
  const agents = useAgentStore(useShallow(s => Object.values(s.agents)))

  return (
    <div style={{
      position: 'relative',
      width: 700,
      height: 508,
      flexShrink: 0,
      overflow: 'hidden',
      border: '4px solid #5a4a3a',
      boxShadow: '0 0 0 2px #3a2a1a, 0 12px 60px rgba(0,0,0,0.6)',
      imageRendering: 'pixelated',
    }}>
      {/* Floor — cream/grey tile checkerboard */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: '#d4ccbc',
        backgroundImage: `
          repeating-linear-gradient(45deg, #cac2b2 25%, transparent 25%, transparent 75%, #cac2b2 75%),
          repeating-linear-gradient(45deg, #cac2b2 25%, #d4ccbc 25%, #d4ccbc 75%, #cac2b2 75%)
        `,
        backgroundSize: '28px 28px',
        backgroundPosition: '0 0, 14px 14px',
      }} />

      {/* Top wall — sage green */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 130,
        background: 'linear-gradient(180deg, #6a8a6a 0%, #7a9a7a 60%, #8aaa8a 100%)',
      }} />

      {/* Wainscoting */}
      <div style={{
        position: 'absolute', top: 110, left: 0, right: 0, height: 20,
        background: '#d4c8a8',
        borderTop: '3px solid #b8a880',
        borderBottom: '3px solid #b8a880',
      }} />

      {/* Windows — 4 across top wall */}
      {[60, 200, 380, 540].map((left, i) => (
        <div key={i} style={{ position: 'absolute', top: 8, left, width: 80, height: 90 }}>
          {/* Window frame */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, #b8d8f0 0%, #e0f0ff 60%, #fff8e8 100%)',
            border: '4px solid #8a7a5a',
            boxShadow: 'inset 0 0 8px rgba(255,255,255,0.6)',
          }} />
          {/* Window cross */}
          <div style={{ position: 'absolute', top: 0, left: '50%', width: 3, height: '100%', background: '#8a7a5a', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 3, background: '#8a7a5a', transform: 'translateY(-50%)' }} />
          {/* Sunlight shaft */}
          <div style={{
            position: 'absolute', top: 94, left: 10,
            width: 60, height: 280,
            background: 'linear-gradient(180deg, rgba(255,240,180,0.25) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
        </div>
      ))}

      {/* ── WORK AREA (top-left) ── */}
      {/* Bookshelf */}
      <div style={{ position: 'absolute', top: 130, left: 8, width: 70, height: 50, background: '#8a6a40', border: '2px solid #6a4a20' }}>
        {[0,1,2].map(i => <div key={i} style={{ position: 'absolute', top: 6, left: 4 + i * 20, width: 14, height: 36, background: ['#c05050','#5080c0','#50a050'][i], border: '1px solid rgba(0,0,0,0.2)' }} />)}
      </div>
      {/* Desk 1 */}
      <div style={{ position: 'absolute', top: 140, left: 90, width: 80, height: 40, background: '#c8a870', border: '2px solid #a07840' }}>
        <div style={{ position: 'absolute', top: -28, left: 15, width: 50, height: 28, background: '#2a2a3a', border: '2px solid #1a1a2a' }}>
          <div style={{ position: 'absolute', inset: 2, background: '#1a3a5a', opacity: 0.8 }} />
        </div>
      </div>
      {/* Desk 2 */}
      <div style={{ position: 'absolute', top: 140, left: 190, width: 80, height: 40, background: '#c8a870', border: '2px solid #a07840' }}>
        <div style={{ position: 'absolute', top: -28, left: 15, width: 50, height: 28, background: '#2a2a3a', border: '2px solid #1a1a2a' }}>
          <div style={{ position: 'absolute', inset: 2, background: '#3a1a5a', opacity: 0.8 }} />
        </div>
      </div>
      {/* Work area plant */}
      <div style={{ position: 'absolute', top: 128, left: 282, fontSize: 24 }}>🌿</div>

      {/* Zone label */}
      <div style={{ position: 'absolute', top: 185, left: 10, fontSize: 7, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', letterSpacing: 1 }}>WORK AREA</div>

      {/* ── STAFF LOUNGE (top-right) ── */}
      {/* Couch */}
      <div style={{ position: 'absolute', top: 145, left: 420, width: 120, height: 45, background: '#6a7a9a', border: '2px solid #4a5a7a', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: '#7a8aaa', borderRadius: '4px 4px 0 0' }} />
        {[10, 50, 90].map(l => <div key={l} style={{ position: 'absolute', top: 14, left: l, width: 28, height: 16, background: '#8a9aba', border: '1px solid #5a6a8a' }} />)}
      </div>
      {/* Coffee table */}
      <div style={{ position: 'absolute', top: 172, left: 460, width: 44, height: 26, background: '#b89060', border: '2px solid #907040', borderRadius: 22 }}>
        <div style={{ position: 'absolute', top: 8, left: 16, width: 8, height: 8, background: '#c05050', borderRadius: '50%' }} />
      </div>
      {/* Fridge */}
      <div style={{ position: 'absolute', top: 130, left: 610, width: 36, height: 60, background: '#c8c8c8', border: '2px solid #888' }}>
        <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 2, background: '#888' }} />
        <div style={{ position: 'absolute', top: 10, right: 4, width: 4, height: 12, background: '#666', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 40, right: 4, width: 4, height: 14, background: '#666', borderRadius: 2 }} />
      </div>
      {/* TV */}
      <div style={{ position: 'absolute', top: 130, left: 658, width: 36, height: 28, background: '#1a1a2a', border: '2px solid #333' }}>
        <div style={{ position: 'absolute', inset: 3, background: '#0a1a2a' }} />
      </div>
      {/* Lounge plants */}
      <div style={{ position: 'absolute', top: 128, left: 590, fontSize: 22 }}>🌱</div>
      <div style={{ position: 'absolute', top: 120, left: 396, fontSize: 26 }}>🪴</div>

      <div style={{ position: 'absolute', top: 185, left: 425, fontSize: 7, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', letterSpacing: 1 }}>STAFF LOUNGE</div>

      {/* Divider wall */}
      <div style={{ position: 'absolute', top: 130, left: 340, width: 4, height: 378, background: '#6a8a6a', opacity: 0.6 }} />
      <div style={{ position: 'absolute', top: 200, left: 0, right: 0, height: 4, background: '#6a8a6a', opacity: 0.4 }} />

      {/* ── COPY ROOM (bottom-left) ── */}
      {/* Printer */}
      <div style={{ position: 'absolute', top: 230, left: 20, width: 80, height: 44, background: '#e0e0e0', border: '2px solid #aaa' }}>
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, height: 6, background: '#fff', border: '1px solid #ccc' }} />
        <div style={{ position: 'absolute', bottom: 6, left: 20, width: 40, height: 8, background: '#f0f0f0', border: '1px solid #ccc' }} />
        <div style={{ position: 'absolute', top: 4, right: 6, width: 8, height: 8, background: '#5080c0', borderRadius: '50%' }} />
      </div>
      {/* Review desk */}
      <div style={{ position: 'absolute', top: 280, left: 20, width: 100, height: 40, background: '#c8a870', border: '2px solid #a07840' }}>
        {/* Papers */}
        <div style={{ position: 'absolute', top: 4, left: 8, width: 36, height: 28, background: '#f0f0e0', border: '1px solid #ccc', transform: 'rotate(-2deg)' }} />
        <div style={{ position: 'absolute', top: 4, left: 20, width: 36, height: 28, background: '#fff', border: '1px solid #ccc', transform: 'rotate(2deg)' }} />
      </div>
      {/* Corkboard */}
      <div style={{ position: 'absolute', top: 210, left: 120, width: 80, height: 60, background: '#c8a040', border: '3px solid #8a6020' }}>
        {['#ff6060','#60a0ff','#60d060','#ffd060'].map((c, i) => (
          <div key={i} style={{ position: 'absolute', top: 8 + (i % 2) * 26, left: 8 + Math.floor(i / 2) * 34, width: 28, height: 20, background: c, opacity: 0.9, transform: `rotate(${(i-1.5)*3}deg)` }} />
        ))}
      </div>
      {/* Copy room plant */}
      <div style={{ position: 'absolute', top: 205, left: 210, fontSize: 22 }}>🌿</div>
      <div style={{ position: 'absolute', top: 370, left: 8, fontSize: 24 }}>🪴</div>

      <div style={{ position: 'absolute', top: 340, left: 10, fontSize: 7, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', letterSpacing: 1 }}>COPY ROOM</div>

      {/* ── MEETING ROOM (bottom-right) ── */}
      {/* Big table */}
      <div style={{ position: 'absolute', top: 240, left: 380, width: 260, height: 90, background: '#b89060', border: '3px solid #907040', borderRadius: 6 }}>
        {/* Chairs around table */}
        {[380, 430, 480, 530, 580].map(l => (
          <div key={l} style={{ position: 'absolute', top: -14, left: l - 380, width: 34, height: 12, background: '#6a5030', border: '1px solid #4a3010', borderRadius: '2px 2px 0 0' }} />
        ))}
        {[380, 430, 480, 530, 580].map(l => (
          <div key={l} style={{ position: 'absolute', bottom: -14, left: l - 380, width: 34, height: 12, background: '#6a5030', border: '1px solid #4a3010', borderRadius: '0 0 2px 2px' }} />
        ))}
      </div>
      {/* Whiteboard */}
      <div style={{ position: 'absolute', top: 210, left: 620, width: 68, height: 50, background: '#f0f0f0', border: '3px solid #888' }}>
        <div style={{ position: 'absolute', top: 6, left: 6, right: 6, height: 2, background: '#aad', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 14, left: 6, right: 20, height: 2, background: '#ada', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 22, left: 6, right: 10, height: 2, background: '#daa', opacity: 0.7 }} />
      </div>
      {/* Meeting room plants */}
      <div style={{ position: 'absolute', top: 360, left: 660, fontSize: 26 }}>🌴</div>
      <div style={{ position: 'absolute', top: 205, left: 356, fontSize: 22 }}>🌿</div>

      <div style={{ position: 'absolute', top: 370, left: 420, fontSize: 7, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', letterSpacing: 1 }}>MEETING ROOM</div>

      {/* Corner plants */}
      <div style={{ position: 'absolute', top: 130, left: 0, fontSize: 22 }}>🌱</div>
      <div style={{ position: 'absolute', top: 460, left: 0, fontSize: 28 }}>🌿</div>
      <div style={{ position: 'absolute', top: 460, left: 660, fontSize: 28 }}>🪴</div>

      {/* Agents rendered over furniture */}
      {agents.map(agent => {
        const zonePos = ZONE_POSITIONS[agent.zone]
        const pos = zonePos?.[agent.id] ?? dynamicPos(agent.id, agent.zone)
        return (
          <Agent
            key={agent.id}
            agent={agent}
            style={{ top: pos.top, left: pos.left, transition: 'top 1.6s cubic-bezier(0.4, 0, 0.2, 1), left 1.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )
      })}
    </div>
  )
}
