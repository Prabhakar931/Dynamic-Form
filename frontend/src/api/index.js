import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const organisations = {
  getAll: () => api.get('/organisations/'),
  getById: (id) => api.get(`/organisations/${id}`),
  create: (data) => api.post('/organisations/', data),
  update: (id, data) => api.put(`/organisations/${id}`, data),
  delete: (id) => api.delete(`/organisations/${id}`),
}

export const forms = {
  getAll: (organisationId = null) => {
    const params = organisationId ? { organisation_id: organisationId } : {}
    return api.get('/forms/', { params })
  },
  getById: (id) => api.get(`/forms/${id}`),
  create: (data) => api.post('/forms/', data),
  update: (id, data) => api.put(`/forms/${id}`, data),
  delete: (id) => api.delete(`/forms/${id}`),
}

export const sections = {
  create: (data) => api.post('/sections/', data),
  getById: (id) => api.get(`/sections/${id}`),
  update: (id, data) => api.put(`/sections/${id}`, data),
  delete: (id) => api.delete(`/sections/${id}`),
}

export const fields = {
  create: (data, sectionId) => api.post('/fields/', data, { params: { section_id: sectionId } }),
  getById: (id) => api.get(`/fields/${id}`),
  update: (id, data) => api.put(`/fields/${id}`, data),
  delete: (id) => api.delete(`/fields/${id}`),
}

export const options = {
  create: (data, fieldId) => api.post('/options/', data, { params: { field_id: fieldId } }),
  getById: (id) => api.get(`/options/${id}`),
  update: (id, data) => api.put(`/options/${id}`, data),
  delete: (id) => api.delete(`/options/${id}`),
}

export const students = {
  getAll: (organisationId = null) => {
    const params = organisationId ? { organisation_id: organisationId } : {}
    return api.get('/students/', { params })
  },
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students/', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
}

export const submissions = {
  getAll: (formId = null, studentId = null) => {
    const params = {}
    if (formId) params.form_id = formId
    if (studentId) params.student_id = studentId
    return api.get('/submissions/', { params })
  },
  getById: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions/', data),
  delete: (id) => api.delete(`/submissions/${id}`),
}

export default api
