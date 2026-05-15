import request from './request'
import qs from 'qs'

export const getDatabases = () => request.get('/databases')
export const createDatabase = (data) => request.post('/databases/create', qs.stringify(data))
export const deleteDatabase = (id) => request.delete(`/databases/${id}`)
