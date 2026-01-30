import { create } from 'zustand'

export interface ConsoleEntry {
  id: string
  timestamp: Date
  method: string
  url: string
  name?: string // Request name
  status?: number
  statusText?: string
  time?: number
  size?: number
  error?: string
  // Full request/response details
  requestHeaders?: Record<string, string>
  requestBody?: string
  responseHeaders?: Record<string, string>
  responseBody?: string
  // Network info
  remoteAddress?: string
  protocol?: string
}

interface ConsoleState {
  entries: ConsoleEntry[]
  isVisible: boolean
  maxEntries: number
  searchQuery: string

  // Actions
  addEntry: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => string
  updateEntry: (id: string, updates: Partial<ConsoleEntry>) => void
  clearEntries: () => void
  toggleVisibility: () => void
  setVisibility: (visible: boolean) => void
  setSearchQuery: (query: string) => void
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  isVisible: false,
  maxEntries: 100,
  searchQuery: '',

  addEntry: (entry) => {
    const id = crypto.randomUUID()
    const newEntry: ConsoleEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    }

    set((state) => {
      const entries = [newEntry, ...state.entries].slice(0, state.maxEntries)
      return { entries }
    })

    return id
  },

  updateEntry: (id, updates) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }))
  },

  clearEntries: () => {
    set({ entries: [] })
  },

  toggleVisibility: () => {
    set((state) => ({ isVisible: !state.isVisible }))
  },

  setVisibility: (visible) => {
    set({ isVisible: visible })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },
}))
