import { create } from 'zustand'
import { Request, Workflow, Environment, HttpMethod, KeyValuePair, RequestBody, AuthConfig } from '@/types'

export type TabType = 'request' | 'workflow' | 'mcp' | 'ai' | 'environments' | 'environment'

// Draft data for unsaved request changes
export interface RequestDraft {
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth?: AuthConfig
  preRequestScript?: string
  testScript?: string
}

export interface Tab {
  id: string
  type: TabType
  title: string
  data?: Request | Workflow | Environment | null
  isDirty?: boolean
  draft?: RequestDraft  // Store unsaved changes
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null

  // Actions
  openTab: (tab: Omit<Tab, 'id'>) => string
  closeTab: (id: string) => void
  closeAllTabs: () => void
  closeOtherTabs: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, data: Partial<Tab>) => void
  getTab: (id: string) => Tab | undefined
  hasUnsavedTabs: () => boolean
}

let tabIdCounter = 0
const generateTabId = () => `tab-${++tabIdCounter}`

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tabData) => {
    const { tabs } = get()

    // Check if tab with same data already exists
    if (tabData.data) {
      const existingTab = tabs.find(
        (t) => t.type === tabData.type && t.data?.id === tabData.data?.id
      )
      if (existingTab) {
        set({ activeTabId: existingTab.id })
        return existingTab.id
      }
    }

    const id = generateTabId()
    const newTab: Tab = { id, ...tabData }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }))

    return id
  },

  closeTab: (id) => {
    set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === id)
      const newTabs = state.tabs.filter((t) => t.id !== id)

      let newActiveId = state.activeTabId
      if (state.activeTabId === id) {
        // Set active to the next tab, or previous if it was the last
        if (newTabs.length > 0) {
          const newIndex = Math.min(tabIndex, newTabs.length - 1)
          newActiveId = newTabs[newIndex].id
        } else {
          newActiveId = null
        }
      }

      return { tabs: newTabs, activeTabId: newActiveId }
    })
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null })
  },

  closeOtherTabs: (id) => {
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === id),
      activeTabId: id,
    }))
  },

  setActiveTab: (id) => {
    set({ activeTabId: id })
  },

  updateTab: (id, data) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    }))
  },

  getTab: (id) => {
    return get().tabs.find((t) => t.id === id)
  },

  hasUnsavedTabs: () => {
    return get().tabs.some((t) => t.isDirty)
  },
}))
