import request from './request'
import qs from 'qs'

export const login = (data) => request.post('/auth/login', qs.stringify(data))
export const logout = () => request.post('/auth/logout')
export const getUserInfo = () => request.get('/user/info')
export const changePassword = (data) => request.post('/user/changePassword', qs.stringify(data))
