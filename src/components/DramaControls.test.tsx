import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DramaControls } from './DramaControls'

describe('DramaControls', () => {
  it('renders slider at default value 25', () => {
    render(<DramaControls dramaLevel={25} onDramaChange={vi.fn()} onChaos={vi.fn()} />)
    expect(screen.getByRole('slider')).toHaveValue('25')
  })
  it('calls onDramaChange when slider moves', () => {
    const fn = vi.fn()
    render(<DramaControls dramaLevel={25} onDramaChange={fn} onChaos={vi.fn()} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } })
    expect(fn).toHaveBeenCalledWith(60)
  })
  it('calls onChaos when button clicked', () => {
    const fn = vi.fn()
    render(<DramaControls dramaLevel={25} onDramaChange={vi.fn()} onChaos={fn} />)
    fireEvent.click(screen.getByText(/STIR THE POT/i))
    expect(fn).toHaveBeenCalled()
  })
})
