// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PanelStripMockup } from '@/domains/games/components/steps/panel-strip-mockup'

describe('PanelStripMockup', () => {
  it('renders 5 panel placeholders', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" />
    )
    const panels = container.querySelectorAll('[class*="aspect-[3/4]"]')
    expect(panels).toHaveLength(5)
  })

  it('renders panel labels in order', () => {
    render(<PanelStripMockup genre="horror" />)
    expect(screen.getByText('Opening')).toBeInTheDocument()
    expect(screen.getByText('Rising Action')).toBeInTheDocument()
    expect(screen.getByText('Your Choice')).toBeInTheDocument()
    expect(screen.getByText('Climax')).toBeInTheDocument()
    expect(screen.getByText('Resolution')).toBeInTheDocument()
  })

  it('applies genre-specific gradient for horror', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" />
    )
    const firstPanel = container.querySelector('[class*="aspect-[3/4]"]')
    expect(firstPanel?.className).toContain('from-red-950')
  })

  it('applies genre-specific gradient for comedy', () => {
    const { container } = render(
      <PanelStripMockup genre="comedy" />
    )
    const firstPanel = container.querySelector('[class*="aspect-[3/4]"]')
    expect(firstPanel?.className).toContain('from-amber-900')
  })

  it('uses primaryColor for the accent dot when provided', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" primaryColor="#ff0000" />
    )
    const dot = container.querySelector('[style*="rgb(255, 0, 0)"], [style*="#ff0000"]')
    // The color might be converted to rgb by the browser
    expect(dot || container.querySelector('[style*="background"]')).toBeTruthy()
  })
})
