import api from './api'

export const createWorker = (data) => api.post('/workers', data)

export const getWorkers = () => api.get('/workers')

export const getWorkerById = (id) => api.get(`/workers/${id}`)

export const updateWorker = (id, data) => api.put(`/workers/${id}`, data)

export const deactivateWorker = (id) => api.delete(`/workers/${id}`)