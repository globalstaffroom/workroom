import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Agent } from './Agent'
import type { AgentState } from '../types'

const agent: AgentState = {
  id: 'coder', name: 'coder', sprite: '🧑‍💻',
  mood: 50, zone: 'work_area', status: 'working',
  bubble: 'auth.ts · ln 142', progress: 71,
}

describe('Agent', () => {
  it('renders sprite', () => {
    render(<Agent agent={agent} />)
    expect(screen.getByText('🧑‍💻')).toBeInTheDocument()
  })
  it('shows bubble when set', () => {
    render(<Agent agent={agent} />)
    expect(screen.getByText('auth.ts · ln 142')).toBeInTheDocument()
  })
  it('hides bubble when null', () => {
    render(<Agent agent={{ ...agent, bubble: null }} />)
    expect(screen.queryByText('auth.ts · ln 142')).toBeNull()
  })
  it('renders status dot', () => {
    const { container } = render(<Agent agent={agent} />)
    expect(container.querySelector('.status-dot')).toBeInTheDocument()
  })
})
