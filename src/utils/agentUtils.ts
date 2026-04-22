import type { Zone } from '../types'

export const DYNAMIC_PALETTE = ['#ff9f7f', '#7fffcf', '#ff7fbf', '#cfff7f', '#7fcfff', '#ffcf7f', '#bf7fff', '#40e0d0']

export function hashCode(str: string): number {
  let h = 0
  for (const c of str) h = (Math.imul(31, h) + (c.codePointAt(0) ?? 0)) | 0
  return Math.abs(h)
}

export function agentColor(id: string): string {
  const known: Record<string, string> = {
    coder: '#58a6ff', tester: '#7ec850', review: '#f0c040', search: '#aa88ff',
  }
  return known[id] ?? DYNAMIC_PALETTE[hashCode(id) % DYNAMIC_PALETTE.length]
}

const ZONE_BOUNDS: Record<Zone, { top: [number, number]; left: [number, number] }> = {
  work_area:    { top: [90,  140], left: [60,  280] },
  lounge:       { top: [70,  110], left: [420, 620] },
  copy_room:    { top: [280, 340], left: [60,  220] },
  meeting_room: { top: [290, 340], left: [380, 590] },
}

export function dynamicPos(agentId: string, zone: Zone): { top: number; left: number } {
  const h = hashCode(agentId)
  const b = ZONE_BOUNDS[zone]
  if (!b) return { top: 90, left: 60 }
  const topRange  = b.top[1]  - b.top[0]
  const leftRange = b.left[1] - b.left[0]
  return {
    top:  b.top[0]  + (topRange  > 0 ? h        % topRange  : 0),
    left: b.left[0] + (leftRange > 0 ? (h >> 4) % leftRange : 0),
  }
}
