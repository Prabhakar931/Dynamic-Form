import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forms, organisations } from '../api'

export default function Forms() {

  const navigate = useNavigate()

  const [formsList, setForms] = useState([])
  const [orgs, setOrgs] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')

  useEffect(() => {
    fetchOrgs()
  }, [])

  useEffect(() => {
    fetchForms(selectedOrg || null)
  }, [selectedOrg])

  const fetchOrgs = async () => {

    const { data } = await organisations.getAll()

    setOrgs(data)
  }

  const fetchForms = async (orgId) => {

    const { data } = await forms.getAll(orgId)

    setForms(data)
  }

  const handleDelete = async (id) => {

    if (confirm('Delete this form?')) {

      await forms.delete(id)

      fetchForms(selectedOrg || null)
    }
  }

  return (
    <div>

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold">
          Forms
        </h2>

        <Link
          to="/forms/new"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Form
        </Link>
      </div>

      <div className="mb-6">

        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >

          <option value="">
            All Organisations
          </option>

          {orgs.map((org) => (

            <option key={org.id} value={org.id}>
              {org.name}
            </option>

          ))}
        </select>
      </div>

      <div className="grid gap-4">

        {formsList.length === 0 ? (

          <p className="text-gray-500">
            No forms yet. Create one to get started.
          </p>

        ) : (

          formsList.map((form) => (

            <div
              key={form.id}
              className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >

              <div className="flex justify-between items-start">

                <div>

                  <h3 className="text-lg font-semibold">
                    {form.name}
                  </h3>

                  {form.description && (
                    <p className="text-gray-600 mt-1">
                      {form.description}
                    </p>
                  )}

                  <div className="mt-2 flex gap-4 text-sm text-gray-500">

                    <span>
                      Sections: {form.sections?.length || 0}
                    </span>

                    <span>
                      Status:

                      <span
                        className={`ml-1 px-2 py-0.5 rounded text-xs ${
                          form.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {form.status}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">

                  <Link
                    to={`/forms/${form.id}/edit`}
                    className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Edit
                  </Link>

                  {form.status === 'PUBLISHED' &&
                    (form.sections?.length || 0) > 0 && (
                    
                    <>
                      <Link
                        to={`/forms/${form.id}/render`}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        View Form
                      </Link>

                      <button
                        onClick={() =>
                          navigate(`/forms/${form.id}/submissions`)
                        }
                        className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        View Submissions
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(form.id)}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}