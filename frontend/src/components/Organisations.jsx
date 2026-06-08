import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { organisations } from '../api'

export default function Organisations () {
  const [organisationsList, setOrganisations] = useState( [] )
  const [name, setName] = useState( '' )
  const [editingId, setEditingId] = useState( null )
  const [loadingOrgs, setLoadingOrgs] = useState( true )

  useEffect( () => {
    fetchOrganisations()
  }, [] )

  const fetchOrganisations = async () => {
    try {
      setLoadingOrgs( true )
      const { data } = await organisations.getAll()
      setOrganisations( data )
    } catch ( err ) {
      toast.error( 'Failed to load organisations' )
    } finally {
      setLoadingOrgs( false )
    }
  }

  const handleSubmit = async ( e ) => {
    e.preventDefault()
    if ( !name.trim() ) {
      toast.error( 'Please enter an organisation name' )
      return
    }

    try {
      if ( editingId ) {
        await organisations.update( editingId, { name } )
        toast.success( 'Organisation updated' )
        setEditingId( null )
      } else {
        await organisations.create( { name } )
        toast.success( 'Organisation created' )
      }
      setName( '' )
      fetchOrganisations()
    } catch ( err ) {
      toast.error( err.response?.data?.error || 'Failed to save organisation' )
    }
  }

  const handleEdit = ( org ) => {
    setEditingId( org.id )
    setName( org.name )
  }

  const handleDelete = async ( id ) => {
    if ( confirm( 'Delete this organisation?' ) ) {
      try {
        await organisations.delete( id )
        toast.success( 'Organisation deleted' )
        fetchOrganisations()
      } catch ( err ) {
        toast.error( 'Failed to delete organisation' )
      }
    }
  }

  const handleCancel = () => {
    setEditingId( null )
    setName( '' )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Organisations</h2>

      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex gap-4">
          <input
            type="text"
            value={name}
            onChange={( e ) => setName( e.target.value )}
            placeholder="Organisation name"
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border">
        {loadingOrgs ?
          <div className="space-y-4">
            {[1, 2, 3].map( i => (
              <div key={i} className="border rounded-xl p-5 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-40 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ) )}
          </div>
          : organisationsList.length === 0 ? (
            <p className="p-6 text-gray-500">No organisations yet. Create one above.</p>
          ) : (
            <ul className="divide-y">
              {organisationsList.map( ( org ) => (
                <li key={org.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-gray-500">Created: {new Date( org.created_at ).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit( org )} className="px-4 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete( org.id )} className="px-4 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
                      Delete
                    </button>
                  </div>
                </li>
              ) )}
            </ul>
          )}
      </div>
    </div>
  )
}
