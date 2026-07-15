import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

// Suppress specific console errors during tests
vi.mock('../../lib/constants', () => ({
  API_BASE_URL: '/api/v1',
  TOKEN_KEY: 'test_token',
  REFRESH_TOKEN_KEY: 'test_refresh_token',
}))
