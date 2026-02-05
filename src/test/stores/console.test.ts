import { describe, it, expect, beforeEach } from 'vitest'
import { useConsoleStore } from '@/stores/console.store'

describe('Console Store', () => {
  beforeEach(() => {
    useConsoleStore.setState({
      entries: [],
      isVisible: false,
      maxEntries: 100,
      searchQuery: '',
    })
  })

  describe('addEntry', () => {
    it('should add an entry and return its id', () => {
      const id = useConsoleStore.getState().addEntry({
        method: 'GET',
        url: 'https://api.example.com',
        status: 200,
        statusText: 'OK',
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')

      const entries = useConsoleStore.getState().entries
      expect(entries).toHaveLength(1)
      expect(entries[0].method).toBe('GET')
      expect(entries[0].url).toBe('https://api.example.com')
      expect(entries[0].status).toBe(200)
    })

    it('should prepend new entries (newest first)', () => {
      useConsoleStore.getState().addEntry({ method: 'GET', url: '/first' })
      useConsoleStore.getState().addEntry({ method: 'POST', url: '/second' })

      const entries = useConsoleStore.getState().entries
      expect(entries[0].url).toBe('/second')
      expect(entries[1].url).toBe('/first')
    })

    it('should assign timestamp to entries', () => {
      useConsoleStore.getState().addEntry({ method: 'GET', url: '/test' })

      const entry = useConsoleStore.getState().entries[0]
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('should enforce circular buffer at maxEntries (100)', () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        useConsoleStore.getState().addEntry({ method: 'GET', url: `/api/${i}` })
      }

      const entries = useConsoleStore.getState().entries
      expect(entries).toHaveLength(100)
      // Newest entry should be last added
      expect(entries[0].url).toBe('/api/104')
    })
  })

  describe('updateEntry', () => {
    it('should update an existing entry by id', () => {
      const id = useConsoleStore.getState().addEntry({
        method: 'GET',
        url: '/test',
      })

      useConsoleStore.getState().updateEntry(id, {
        status: 200,
        statusText: 'OK',
        time: 150,
      })

      const entry = useConsoleStore.getState().entries.find(e => e.id === id)
      expect(entry!.status).toBe(200)
      expect(entry!.statusText).toBe('OK')
      expect(entry!.time).toBe(150)
    })

    it('should not modify other entries', () => {
      const id1 = useConsoleStore.getState().addEntry({ method: 'GET', url: '/first' })
      const id2 = useConsoleStore.getState().addEntry({ method: 'POST', url: '/second' })

      useConsoleStore.getState().updateEntry(id1, { status: 500 })

      const entry2 = useConsoleStore.getState().entries.find(e => e.id === id2)
      expect(entry2!.status).toBeUndefined()
    })
  })

  describe('clearEntries', () => {
    it('should remove all entries', () => {
      useConsoleStore.getState().addEntry({ method: 'GET', url: '/test' })
      useConsoleStore.getState().addEntry({ method: 'POST', url: '/test2' })

      useConsoleStore.getState().clearEntries()

      expect(useConsoleStore.getState().entries).toHaveLength(0)
    })
  })

  describe('toggleVisibility', () => {
    it('should toggle from false to true', () => {
      useConsoleStore.getState().toggleVisibility()
      expect(useConsoleStore.getState().isVisible).toBe(true)
    })

    it('should toggle from true to false', () => {
      useConsoleStore.setState({ isVisible: true })
      useConsoleStore.getState().toggleVisibility()
      expect(useConsoleStore.getState().isVisible).toBe(false)
    })
  })

  describe('setVisibility', () => {
    it('should set visibility to true', () => {
      useConsoleStore.getState().setVisibility(true)
      expect(useConsoleStore.getState().isVisible).toBe(true)
    })

    it('should set visibility to false', () => {
      useConsoleStore.setState({ isVisible: true })
      useConsoleStore.getState().setVisibility(false)
      expect(useConsoleStore.getState().isVisible).toBe(false)
    })
  })

  describe('setSearchQuery', () => {
    it('should update the search query', () => {
      useConsoleStore.getState().setSearchQuery('error')
      expect(useConsoleStore.getState().searchQuery).toBe('error')
    })

    it('should clear the search query', () => {
      useConsoleStore.setState({ searchQuery: 'test' })
      useConsoleStore.getState().setSearchQuery('')
      expect(useConsoleStore.getState().searchQuery).toBe('')
    })
  })
})
