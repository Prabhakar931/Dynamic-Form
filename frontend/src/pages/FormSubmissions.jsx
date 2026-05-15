import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { forms, submissions } from '../api'

export default function FormSubmissions() {

  const { Id } = useParams()

  const [form, setForm] = useState(null)

  const [submissionsList, setSubmissions] = useState([])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [formId])

  const loadData = async () => {

    try {

      setLoading(true)

      // Load form details
      const formResponse = await forms.getById(Id)

      setForm(formResponse.data)

      // Load submissions for this form
      const response = await forms.getSubmissions(Id)

      setSubmissions(response.data || [])

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Failed to load submissions'
      )

    } finally {

      setLoading(false)
    }
  }

  const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this submission?'
    )

    if (!confirmDelete) return

    try {

      await submissions.delete(id)

      setSubmissions(prev =>
        prev.filter(
          submission => submission.id !== id
        )
      )

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Failed to delete submission'
      )
    }
  }

  if (loading) {

    return (
      <div className="p-6 text-gray-600">
        Loading submissions...
      </div>
    )
  }

  return (

    <div className="max-w-7xl mx-auto p-6">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h1 className="text-3xl font-bold text-gray-800">
            {form?.name || 'Form'} Submissions
          </h1>

          <p className="text-gray-500 mt-1">
            View all submissions for this form
          </p>

        </div>

        <Link
          to="/forms"
          className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </Link>

      </div>

      {submissionsList.length === 0 ? (

        <div className="bg-white border rounded-2xl p-10 text-center text-gray-500 shadow-sm">
          No submissions found for this form.
        </div>

      ) : (

        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">

          <table className="w-full">

            <thead className="bg-gray-50 border-b">

              <tr>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                  ID
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                  Student
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                  Submitted At
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                  Answers
                </th>

                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {submissionsList.map((submission) => (

                <tr
                  key={submission.id}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="px-6 py-4">
                    {submission.id}
                  </td>

                  <td className="px-6 py-4">
                    {submission.student_name || 'Unknown'}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {submission.submitted_at
                      ? new Date(
                          submission.submitted_at
                        ).toLocaleString()
                      : '-'}
                  </td>

                  <td className="px-6 py-4">
                    {submission.answers
                      ? Object.keys(
                          submission.answers
                        ).length
                      : 0}
                  </td>

                  <td className="px-6 py-4">

                    <div className="flex justify-end gap-2">

                      <Link
                        to={`/submissions/${submission.id}`}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        View
                      </Link>

                      <button
                        onClick={() =>
                          handleDelete(submission.id)
                        }
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  )
}