export type Zone = 'work_area' | 'lounge' | 'copy_room' | 'meeting_room'
export type AgentStatus = 'idle' | 'working' | 'waiting' | 'reacting' | 'offline'

export interface AgentState {
  id:       string
  name:     string
  sprite:   string
  mood:     number        // 0-100
  zone:     Zone
  status:   AgentStatus
  bubble:   string | null // current speech bubble text
  progress: number        // 0-100, current task progress
}

export interface FeedEntry {
  id:        string
  agentId:   string
  message:   string
  timestamp: number
  color:     string       // agent's colour
}

export interface DramaState {
  level: number           // 0-100
}

// WebSocket message types (orchestrator → UI)
export type WsMessage =
  | { type: 'init';          agents: AgentState[] }
  | { type: 'agent_updated'; agent: AgentState }
  | { type: 'feed_entry';    entry: FeedEntry }
  | { type: 'bubble';        agentId: string; text: string; durationMs: number }
  | { type: 'mood_changed';  agentId: string; mood: number }
  | { type: 'zone_changed';  agentId: string; zone: Zone }
  | { type: 'drama_event';   eventName: string; agentId: string; description: string }
  | { type: 'task_result';   agentId: string; result: string; taskId: string }
  | { type: 'agent_busy';    agentId: string }

// Commands sent from UI → orchestrator
export type UiCommand =
  | { type: 'assign_task';   agentId: string; task: string }
  | { type: 'set_drama';     level: number }
  | { type: 'fire_chaos' }
  | { type: 'get_state' }
