import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders header with NovaGift title', () => {
    render(<App />)
    const title = screen.getByText(/NovaGift/i)
    expect(title).toBeDefined()
  })
  
  it('renders sidebar navigation', () => {
    render(<App />)
    const createLink = screen.getByText(/Create/i)
    expect(createLink).toBeDefined()
  })
})