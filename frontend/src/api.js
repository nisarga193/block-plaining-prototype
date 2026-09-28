/**
 * Central place for all backend calls. Base URL points at the local
 * FastAPI dev server (uvicorn main:app --reload, default port 8000).
 */
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getTasks = () => api.get('/tasks').then(r => r.data)
export const getStrategicBlocks = (horizon = 'weekly') => api.get('/blocks/strategic', { params: { horizon } }).then(r => r.data)
export const triggerEmergency = (taskId) => api.post(`/blocks/emergency/${taskId}`).then(r => r.data)
export const getLiveAlerts = () => api.get('/alerts/live').then(r => r.data)
export const resetAlerts = () => api.post('/alerts/reset').then(r => r.data)
export const getKPIs = () => api.get('/kpis').then(r => r.data)
export const submitTokenAction = (payload) => api.post('/tokens/action', payload).then(r => r.data)
export const getAuditLog = () => api.get('/tokens/audit-log').then(r => r.data)
export const checkEscalations = (demoThresholdSeconds) =>
  api.get('/tokens/check-escalations', { params: demoThresholdSeconds ? { demo_threshold_seconds: demoThresholdSeconds } : {} }).then(r => r.data)

export default api
export const getTokenStatus = (blockId) => api.get(`/tokens/status/${blockId}`).then(r => r.data)
