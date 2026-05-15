import request from './request'

export const getBattlefieldRealtimeStats = () => request.get('/battlefield-realtime/stats')
export const enableBattlefieldRealtime = () => request.get('/enable/getBattlefieldRealtime')
export const disableBattlefieldRealtime = () => request.get('/disable/getBattlefieldRealtime')
export const getBattlefieldRealtimePackets = (params) => request.get('/battlefield-realtime/packets', { params })
export const clearBattlefieldRealtimePackets = () => request.delete('/battlefield-realtime/packets')
export const searchRealtimeMonitorTeams = (params) => request.get('/statistics/player-teams/realtime-search', { params })
export const getBattlefieldStats = (params) => request.get('/battle/battlefield-stats', { params })
export const getBattleReports = (params) => request.get('/battle/reports', { params })
export const deleteBattleReports = (params) => request.delete('/battle/reports', { params })
