import { WebSocketServer, WebSocket } from 'ws'
import Database from 'better-sqlite3'
import { Orchestrator } from './orchestrator'
import type { WsMessage, UiCommand } from '../../src/types'

export function startServer(db: Database.Database, port = 7331): { orch: Orchestrator; wss: WebSocketServer } {
  const wss = new WebSocketServer({ port })
  const orch = new Orchestrator(db)

  const broadcast = (msg: WsMessage) => {
    const raw = JSON.stringify(msg)
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(raw)
    })
  }

  orch.setBroadcast(broadcast)

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', agents: orch.getState().agents } satisfies WsMessage))

    ws.on('message', (data) => {
      try {
        const cmd = JSON.parse(data.toString()) as UiCommand
        orch.handleCommand(cmd)
      } catch (e) {
        console.error('[server] bad message', e)
      }
    })
  })

  console.log(`[workroom] orchestrator WS listening on ws://localhost:${port}`)
  return { orch, wss }
}
