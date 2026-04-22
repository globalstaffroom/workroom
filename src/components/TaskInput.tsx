import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { send } from '../hooks/useOrchestrator'
import { useAgentStore } from '../store/agentStore'

export function TaskInput() {
  const [task, setTask] = useState('')
  const [agentId, setAgentId] = useState('')
  const [busyMsg, setBusyMsg] = useState('')
  const agents = useAgentStore(useShallow(s => Object.values(s.agents)))

  // Default to first available agent once agents load
  useEffect(() => {
    if (!agentId && agents.length > 0) setAgentId(agents[0].id)
  }, [agents, agentId])

  const selectedAgent = agents.find(a => a.id === agentId)

  const assign = () => {
    if (!task.trim() || !agentId) return
    if (selectedAgent?.status === 'working') {
      setBusyMsg(`${agentId} is busy`)
      setTimeout(() => setBusyMsg(''), 2000)
      return
    }
    send({ type: 'assign_task', agentId, task })
    setTask('')
    setBusyMsg('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#0a0f1a', borderTop: '2px solid #1a2030', flexShrink: 0 }}>
      {busyMsg && (
        <div style={{ padding: '3px 18px', fontSize: 9, color: '#f08030', fontFamily: 'monospace', background: '#1a0f00' }}>
          {busyMsg}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '6px 18px' }}>
        <select
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          style={{ background: '#111820', border: '2px solid #2a3848', color: '#aab', fontSize: 9, padding: '4px 6px', fontFamily: 'monospace' }}
        >
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && assign()}
          placeholder="assign a task..."
          style={{ flex: 1, background: '#111820', border: '2px solid #2a3848', color: '#aab', fontSize: 9, padding: '4px 8px', fontFamily: 'monospace' }}
        />
        <button
          onClick={assign}
          style={{ background: '#0a2a0a', border: '2px solid #7ec850', color: '#7ec850', fontSize: 9, padding: '4px 12px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}
        >
          GO
        </button>
      </div>
    </div>
  )
}
