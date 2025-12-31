import axios, { AxiosInstance, AxiosError } from 'axios'
import { useBackendStore } from '@/stores/backend.store'
import toast from 'react-hot-toast'

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add base URL dynamically
  instance.interceptors.request.use((config) => {
    const { baseUrl } = useBackendStore.getState()
    config.baseURL = `${baseUrl}/api/v1`
    return config
  })

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        // Server responded with error
        const status = error.response.status
        const data = error.response.data as Record<string, unknown>

        if (status === 404) {
          console.error('Resource not found:', error.config?.url)
        } else if (status === 500) {
          toast.error('Server error occurred')
          console.error('Server error:', data)
        } else if (status === 400) {
          const message = data?.detail || data?.message || 'Invalid request'
          toast.error(String(message))
        }
      } else if (error.request) {
        // No response received
        toast.error('Cannot connect to server')
        console.error('Network error:', error.message)
      }

      return Promise.reject(error)
    }
  )

  return instance
}

export const api = createApiClient()

// Default export for convenience
export default api

// Typed API helpers
export const apiGet = <T>(url: string) => api.get<T>(url).then((r) => r.data)
export const apiPost = <T>(url: string, data?: unknown) => api.post<T>(url, data).then((r) => r.data)
export const apiPut = <T>(url: string, data: unknown) => api.put<T>(url, data).then((r) => r.data)
export const apiPatch = <T>(url: string, data: unknown) => api.patch<T>(url, data).then((r) => r.data)
export const apiDelete = (url: string) => api.delete(url)
