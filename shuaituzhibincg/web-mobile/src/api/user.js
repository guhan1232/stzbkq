import request from './request'

export const getUsers = (params) => request.get('/admin/users', { params })
export const deleteUser = (id) => request.delete(`/admin/users/${id}`)
