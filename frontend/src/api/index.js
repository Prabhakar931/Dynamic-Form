import axios from 'axios'
const PROD = true

const api = axios.create( {
  baseURL: PROD ? 'https://dynamic-form-backend-koe5.onrender.com/api' : "http://localhost:3000/api",
  headers: {
    'Content-Type': 'application/json',
  },
} )

api.interceptors.request.use( ( config ) => {
  const token = localStorage.getItem( 'auth_token' )
  if ( token ) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
} )

api.interceptors.response.use(
  ( res ) => res,
  ( err ) => {
    if ( err.response?.status === 401 ) {
      localStorage.removeItem( 'auth_token' )
      if ( window.location.pathname !== '/login' ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject( err )
  }
)

export const auth = {
  login: ( username, password ) =>
    api.post( '/auth/login', { username, password } ),

  me: () =>
    api.get( '/auth/me' ),
}

export const organisations = {
  getAll: () => api.get( '/organisations/' ),

  getById: ( id ) =>
    api.get( `/organisations/${id}` ),

  create: ( data ) =>
    api.post( '/organisations/', data ),

  update: ( id, data ) =>
    api.put( `/organisations/${id}`, data ),

  delete: ( id ) =>
    api.delete( `/organisations/${id}` ),
}

export const forms = {
  getAll: ( organisationId = null ) => {
    const params = organisationId
      ? { organisation_id: organisationId }
      : {}

    return api.get( '/forms/', { params } )
  },

  getById: ( id ) =>
    api.get( `/forms/${id}` ),

  // ✅ NEW
  getSubmissions: ( id ) =>
    api.get( `/forms/${id}/submissions` ),

  create: ( data ) =>
    api.post( '/forms/', data ),

  update: ( id, data ) =>
    api.put( `/forms/${id}`, data ),

  delete: ( id ) =>
    api.delete( `/forms/${id}` ),
}

export const sections = {
  create: ( data ) =>
    api.post( '/sections/', data ),

  getById: ( id ) =>
    api.get( `/sections/${id}` ),

  update: ( id, data ) =>
    api.put( `/sections/${id}`, data ),

  delete: ( id ) =>
    api.delete( `/sections/${id}` ),
}

export const fields = {
  create: ( data, sectionId ) =>
    api.post(
      '/fields/',
      data,
      {
        params: {
          section_id: sectionId
        }
      }
    ),

  getById: ( id ) =>
    api.get( `/fields/${id}` ),

  update: ( id, data ) =>
    api.put( `/fields/${id}`, data ),

  delete: ( id ) =>
    api.delete( `/fields/${id}` ),
}

export const options = {
  create: ( data, fieldId ) =>
    api.post(
      '/options/',
      data,
      {
        params: {
          field_id: fieldId
        }
      }
    ),

  getById: ( id ) =>
    api.get( `/options/${id}` ),

  update: ( id, data ) =>
    api.put( `/options/${id}`, data ),

  delete: ( id ) =>
    api.delete( `/options/${id}` ),
}

export const submissions = {
  getById: ( id ) =>
    api.get( `/submissions/${id}` ),

  create: ( data ) =>
    api.post( '/submissions/', data ),

  delete: ( id ) =>
    api.delete( `/submissions/${id}` ),
}

export default api