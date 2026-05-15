import request from './request'

export const getTeamUsers = (params) => request.get('/getTeamUser', { params })
export const getTeamGroups = () => request.get('/getTeamGroup')
