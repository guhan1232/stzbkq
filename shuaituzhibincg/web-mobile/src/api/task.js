import request from './request'
import qs from 'qs'

export const getTasks = (params) => request.get('/getTaskList', { params })
export const createTask = (data) => request.post('/createTask', qs.stringify(data))
export const deleteTask = (id) => request.get(`/deleteTask/${id}`)
export const getTaskDetail = (id) => request.get(`/getTask/${id}`)
export const enableBattleReport = () => request.post('/enable/getBattleReport')
export const disableBattleReport = () => request.get('/disable/getBattleReport')
