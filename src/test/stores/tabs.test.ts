import { describe, it, expect, beforeEach } from 'vitest'
import { useTabsStore } from '@/stores/tabs.store'

describe('Tabs Store', () => {
  beforeEach(() => {
    useTabsStore.setState({
      tabs: [],
      activeTabId: null,
      currentWorkspaceId: null,
      workspaceTabs: new Map(),
    })
  })

  describe('openTab', () => {
    it('should open a new tab and set it active', () => {
      const id = useTabsStore.getState().openTab({
        type: 'request',
        title: 'Test Request',
        data: null,
      })

      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.activeTabId).toBe(id)
      expect(state.tabs[0].title).toBe('Test Request')
      expect(state.tabs[0].type).toBe('request')
    })

    it('should deduplicate tabs with same data id and type', () => {
      const mockData = { id: 'req-1', name: 'Test' } as any

      const id1 = useTabsStore.getState().openTab({
        type: 'request',
        title: 'Test',
        data: mockData,
      })

      const id2 = useTabsStore.getState().openTab({
        type: 'request',
        title: 'Test',
        data: mockData,
      })

      expect(id1).toBe(id2)
      expect(useTabsStore.getState().tabs).toHaveLength(1)
    })

    it('should not deduplicate tabs with different types', () => {
      const mockData = { id: 'item-1', name: 'Test' } as any

      useTabsStore.getState().openTab({
        type: 'request',
        title: 'Test',
        data: mockData,
      })

      useTabsStore.getState().openTab({
        type: 'workflow',
        title: 'Test',
        data: mockData,
      })

      expect(useTabsStore.getState().tabs).toHaveLength(2)
    })

    it('should allow opening tabs without data (no dedup)', () => {
      useTabsStore.getState().openTab({
        type: 'ai',
        title: 'AI Chat 1',
      })

      useTabsStore.getState().openTab({
        type: 'ai',
        title: 'AI Chat 2',
      })

      expect(useTabsStore.getState().tabs).toHaveLength(2)
    })
  })

  describe('closeTab', () => {
    it('should remove the tab', () => {
      const id = useTabsStore.getState().openTab({
        type: 'request',
        title: 'Test',
        data: null,
      })

      useTabsStore.getState().closeTab(id)
      expect(useTabsStore.getState().tabs).toHaveLength(0)
      expect(useTabsStore.getState().activeTabId).toBeNull()
    })

    it('should select next tab when closing active tab', () => {
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      const id2 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })
      const id3 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 3', data: null })

      // Set active to first tab
      useTabsStore.getState().setActiveTab(id1)

      useTabsStore.getState().closeTab(id1)

      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(2)
      // Should select tab at same index (which is id2)
      expect(state.activeTabId).toBe(id2)
    })

    it('should select previous tab when closing last tab in list', () => {
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      const id2 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })

      // Active is id2 (last opened)
      useTabsStore.getState().closeTab(id2)

      expect(useTabsStore.getState().activeTabId).toBe(id1)
    })

    it('should not change active tab when closing non-active tab', () => {
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      const id2 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })

      // Active is id2
      useTabsStore.getState().closeTab(id1)

      expect(useTabsStore.getState().activeTabId).toBe(id2)
    })
  })

  describe('closeAllTabs', () => {
    it('should remove all tabs and clear active', () => {
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })

      useTabsStore.getState().closeAllTabs()

      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(0)
      expect(state.activeTabId).toBeNull()
    })
  })

  describe('closeOtherTabs', () => {
    it('should keep only the specified tab', () => {
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 3', data: null })

      useTabsStore.getState().closeOtherTabs(id1)

      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe(id1)
      expect(state.activeTabId).toBe(id1)
    })
  })

  describe('setActiveTab', () => {
    it('should set the active tab id', () => {
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 2', data: null })

      useTabsStore.getState().setActiveTab(id1)
      expect(useTabsStore.getState().activeTabId).toBe(id1)
    })
  })

  describe('updateTab', () => {
    it('should update tab data', () => {
      const id = useTabsStore.getState().openTab({ type: 'request', title: 'Old Title', data: null })

      useTabsStore.getState().updateTab(id, { title: 'New Title', isDirty: true })

      const tab = useTabsStore.getState().tabs[0]
      expect(tab.title).toBe('New Title')
      expect(tab.isDirty).toBe(true)
    })
  })

  describe('getTab', () => {
    it('should return the tab by id', () => {
      const id = useTabsStore.getState().openTab({ type: 'request', title: 'Test', data: null })

      const tab = useTabsStore.getState().getTab(id)
      expect(tab).toBeDefined()
      expect(tab!.title).toBe('Test')
    })

    it('should return undefined for non-existent id', () => {
      const tab = useTabsStore.getState().getTab('nonexistent')
      expect(tab).toBeUndefined()
    })
  })

  describe('hasUnsavedTabs', () => {
    it('should return false when no tabs are dirty', () => {
      useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      expect(useTabsStore.getState().hasUnsavedTabs()).toBe(false)
    })

    it('should return true when a tab is dirty', () => {
      const id = useTabsStore.getState().openTab({ type: 'request', title: 'Tab 1', data: null })
      useTabsStore.getState().updateTab(id, { isDirty: true })
      expect(useTabsStore.getState().hasUnsavedTabs()).toBe(true)
    })
  })

  describe('switchWorkspace', () => {
    it('should save current tabs and load new workspace tabs', () => {
      // Open tabs in default workspace
      const id1 = useTabsStore.getState().openTab({ type: 'request', title: 'Default Tab', data: null })

      // Switch to workspace-1
      useTabsStore.getState().switchWorkspace('workspace-1')

      // Should have empty tabs in new workspace
      expect(useTabsStore.getState().tabs).toHaveLength(0)
      expect(useTabsStore.getState().activeTabId).toBeNull()
      expect(useTabsStore.getState().currentWorkspaceId).toBe('workspace-1')

      // Open a tab in workspace-1
      const id2 = useTabsStore.getState().openTab({ type: 'request', title: 'WS1 Tab', data: null })

      // Switch back to default
      useTabsStore.getState().switchWorkspace(null)

      // Should restore default workspace tabs
      expect(useTabsStore.getState().tabs).toHaveLength(1)
      expect(useTabsStore.getState().tabs[0].id).toBe(id1)
    })

    it('should handle null workspace as default', () => {
      useTabsStore.getState().switchWorkspace(null)
      expect(useTabsStore.getState().currentWorkspaceId).toBeNull()
    })

    it('should preserve tabs when switching back and forth', () => {
      // Add tab in default
      useTabsStore.getState().openTab({ type: 'request', title: 'Default', data: null })

      // Switch to ws-1, add tab
      useTabsStore.getState().switchWorkspace('ws-1')
      useTabsStore.getState().openTab({ type: 'request', title: 'WS1', data: null })

      // Switch to ws-2, add tab
      useTabsStore.getState().switchWorkspace('ws-2')
      useTabsStore.getState().openTab({ type: 'request', title: 'WS2', data: null })

      // Go back to ws-1
      useTabsStore.getState().switchWorkspace('ws-1')
      expect(useTabsStore.getState().tabs).toHaveLength(1)
      expect(useTabsStore.getState().tabs[0].title).toBe('WS1')
    })
  })
})
