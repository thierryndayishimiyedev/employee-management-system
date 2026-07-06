import api from './api'

export const getRoles = () => api.get('/roles')

export const getRoleById = (id) => api.get(`/roles/${id}`)