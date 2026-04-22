import { useEffect, useRef } from 'react'
import { useAgentStore } from '../store/agentStore'
import { useFeedStore } from '../store/feedStore'
import type { WsMessage, UiCommand } from '../types'

const WS_URL = 'ws://localhost:7331'

export function useOrchestrator() {
  const ws = useRef<WebSocket | null>(null)
  const { upsertAgent, setMood, setZone, setBubble } = useAgentStore()
  const { addEntry } = useFeedStore()

  useEffect(() => {
    function connect() {
      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data) as WsMessage
        switch (msg.type) {
          case 'init':
            msg.agents.forEach(upsertAgent)
            break
          case 'agent_updated':
            upsertAgent(msg.agent)
            break
          case 'feed_entry':
            addEntry(msg.entry)
            break
          case 'bubble':
            setBubble(msg.agentId, msg.text, msg.durationMs)
            break
          case 'mood_changed':
            setMood(msg.agentId, msg.mood)
            break
          case 'zone_changed':
            setZone(msg.agentId, msg.zone)
            break
        }
      }

      socket.onclose = () => {
        ws.current = null
        setTimeout(connect, 2000)
      }
    }
    connect()
    return () => ws.current?.close()
  }, [])

  const send = (cmd: UiCommand) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(cmd))
    }
  }

  return { send }
}
