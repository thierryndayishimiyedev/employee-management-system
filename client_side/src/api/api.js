import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  // Ensure headers object exists (some environments may not set it)
  config.headers = config.headers || {}
  if (token) {
    // Set both Authorization forms to be safe
    config.headers.Authorization = `Bearer ${token}`
    config.headers.authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally: clear stored auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    } catch {
      // ignore
    }
    return Promise.reject(error)
  }
)

export default api
