import { useEffect } from 'react'
import { useAgentStore } from '../store/agentStore'
import { useFeedStore } from '../store/feedStore'
import type { WsMessage, UiCommand } from '../types'

const WS_URL = 'ws://localhost:7331'

// Module-level singleton — one WS connection shared across all hook instances
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const pendingQueue: string[] = []


export function send(cmd: UiCommand) {
  const msg = JSON.stringify(cmd)
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(msg)
  } else {
    pendingQueue.push(msg)
  }
}

// Handlers registered by the single connected component
type Handlers = {
  upsertAgent: ReturnType<typeof useAgentStore.getState>['upsertAgent']
  setMood: ReturnType<typeof useAgentStore.getState>['setMood']
  setZone: ReturnType<typeof useAgentStore.getState>['setZone']
  setBubble: ReturnType<typeof useAgentStore.getState>['setBubble']
  addEntry: ReturnType<typeof useFeedStore.getState>['addEntry']
}

let handlers: Handlers | null = null

function handleMessage(msg: WsMessage) {
  if (!handlers) return
  switch (msg.type) {
    case 'init':
      msg.agents.forEach(handlers.upsertAgent)
      break
    case 'agent_updated':
      handlers.upsertAgent(msg.agent)
      break
    case 'feed_entry':
      handlers.addEntry(msg.entry)
      break
    case 'bubble':
      handlers.setBubble(msg.agentId, msg.text, msg.durationMs)
      break
    case 'mood_changed':
      handlers.setMood(msg.agentId, msg.mood)
      break
    case 'zone_changed':
      handlers.setZone(msg.agentId, msg.zone)
      break
  }
}

function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

  socket = new WebSocket(WS_URL)

  socket.onopen = () => {
    while (pendingQueue.length) socket!.send(pendingQueue.shift()!)
  }

  socket.onmessage = (e) => {
    try { handleMessage(JSON.parse(e.data) as WsMessage) } catch {}
  }

  socket.onclose = () => {
    socket = null
    reconnectTimer = setTimeout(connect, 2000)
  }
}

// Called once by App — sets up the connection and registers store handlers
export function useOrchestrator() {
  const { upsertAgent, setMood, setZone, setBubble } = useAgentStore()
  const { addEntry } = useFeedStore()

  useEffect(() => {
    handlers = { upsertAgent, setMood, setZone, setBubble, addEntry }
    connect()
    return () => {
      handlers = null
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    }
  }, [])

  return { send }
}
