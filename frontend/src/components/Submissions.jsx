import { useState, useEffect } from 'react'
import { submissions, forms, students } from '../api'

export default function Submissions() {
  const [submissionsList, setSubmissions] = useState([])
  const [formsList, setFormsList] = useState([])
  const [studentsList, setStudentsList] = useState([])
  const [selectedForm, setSelectedForm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  // 🔥 NEW STATE
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    forms.getAll().then(({ data }) => setFormsList(data))
    students.getAll().then(({ data }) => setStudentsList(data))
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [selectedForm, selectedStudent])

  const fetchSubmissions = async () => {
    const formId = selectedForm || null
    const studentId = selectedStudent || null
    const { data } = await submissions.getAll(formId, studentId)
    setSubmissions(data)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this submission?')) {
      await submissions.delete(id)
      fetchSubmissions()
    }
  }

  // 🔥 VIEW HANDLER
  const handleView = async (id) => {
    try {
      const { data } = await submissions.getById(id)
      setSelectedSubmission(data)
      setShowModal(true)
    } catch (err) {
      console.error(err)
    }
  }

  const getFormName = (formId) =>
    formsList.find(f => f.id === formId)?.name || 'Unknown'

  const getStudentName = (studentId) =>
    studentsList.find(s => s.id === studentId)?.student_identifier || 'Unknown'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Submissions</h2>

      <div className="flex gap-4 mb-6">
        <select
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Forms</option>
          {formsList.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Students</option>
          {studentsList.map(s => (
            <option key={s.id} value={s.id}>
              {s.student_identifier}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        {submissionsList.length === 0 ? (
          <p className="p-6 text-gray-500">No submissions yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Form</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Student</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Submitted At</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Answers</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {submissionsList.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{sub.id}</td>
                  <td className="p-4 font-medium">{getFormName(sub.form_id)}</td>
                  <td className="p-4">{getStudentName(sub.student_id)}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(sub.submitted_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm">{sub.answers?.length || 0}</td>

                  <td className="p-4 text-right space-x-2">
                    {/* 🔵 VIEW BUTTON */}
                    <button
                      onClick={() => handleView(sub.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>

                    {/* 🔴 DELETE BUTTON */}
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔥 MODAL */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-lg">
            
            <h3 className="text-lg font-bold mb-4">
              {selectedSubmission.submission.form_name}
            </h3>

            {selectedSubmission.sections.map((section, idx) => (
  <div key={idx} className="mb-6">

    {/* Section Title */}
    <h4 className="text-md font-semibold border-b pb-1 mb-3 flex items-center gap-2">
      {section.title}
    </h4>

    {/* Section Fields */}
    {section.answers.map((ans, index) => (
      <div key={index} className="mb-3">
        
        <label className="text-sm text-gray-600">
          {ans.label}
        </label>
        

        <div className="p-2 bg-gray-100 rounded">
          {/* {typeof Array.isArray(ans.value) ? JSON.stringify(ans.value.join(', '))
            : '' } */}
          {ans.field_type === 'checkbox' && Array.isArray(ans.value)
            ? ans.value.join(', ')
            : typeof ans.value === 'object'
              ? JSON.stringify(ans.value)
              : ans.value}
          {/* {typeof ans.value === 'object' && !Array.isArray(ans.value)
            ? JSON.stringify(ans.value)
            : ""} */}
        </div>

      </div>
    ))}

  </div>
))}

            <div className="text-right mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}