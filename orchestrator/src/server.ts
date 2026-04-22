import { WebSocketServer, WebSocket } from 'ws'
import Database from 'better-sqlite3'
import { Orchestrator } from './orchestrator'
import type { WsMessage, UiCommand } from '../../src/types'

export function startServer(db: Database.Database, port = 7331): { orch: Orchestrator; wss: WebSocketServer } {
  const wss = new WebSocketServer({ port })
  const orch = new Orchestrator(db)

  wss.on('error', (err) => console.error('[server] wss error:', err))

  const broadcast = (msg: WsMessage) => {
    const raw = JSON.stringify(msg)
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw, (err) => { if (err) console.error('[server] send error:', err.message) })
      }
    })
  }

  orch.setBroadcast(broadcast)

  wss.on('connection', (ws) => {
    ws.on('error', (err) => console.error('[server] client ws error:', err.message))

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
