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
    forms.getAll()
      .then(({ data }) => setFormsList(data))

    students.getAll()
      .then(({ data }) => setStudentsList(data))
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [selectedForm, selectedStudent])

  const fetchSubmissions = async () => {
    try {
      const formId = selectedForm || null
      const studentId = selectedStudent || null

      const { data } = await submissions.getAll(
        formId,
        studentId
      )
      setSubmissions(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this submission?')
    if (!confirmed) return

    try {
      await submissions.delete(id)
      fetchSubmissions()
    } catch (err) {
      console.error(err)
      alert('Failed to delete submission')
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
      alert('Failed to load submission')
    }
  }

  const getFormName = (formId) =>
    formsList.find(f => f.id === formId)?.name || 'Unknown'

  const getStudentName = (studentId) =>
    studentsList.find(s => s.id === studentId)?.student_identifier || 'Unknown'

  // Helper function to handle stringified JSON safely
  const parseMatrixValue = (value) => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;

    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      console.error("Failed to parse matrix JSON value:", e);
      return {};
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Submissions</h2>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Forms</option>
          {formsList.map(form => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Students</option>
          {studentsList.map(student => (
            <option key={student.id} value={student.id}>
              {student.student_identifier}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
              {submissionsList.map(submission => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{submission.id}</td>
                  <td className="p-4 font-medium">{getFormName(submission.form_id)}</td>
                  <td className="p-4">{getStudentName(submission.student_id)}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm">{submission.answers?.length || 0}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleView(submission.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(submission.id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[650px] max-h-[85vh] overflow-y-auto shadow-lg">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {selectedSubmission.submission?.form_name || "Form Submission"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {selectedSubmission.sections?.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8">
                <h4 className="text-md font-semibold text-gray-800 mb-4 border-b pb-2">
                  {section.title}
                </h4>

                {section.answers?.map((ans, index) => (
                  <div key={index} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {ans.label}
                    </label>
                    <div className="text-red-500 text-xs mb-1">
                      TYPE: {ans.field_type}
                    </div>

                    <div className="p-3 bg-gray-100 rounded">

                      {/* MATRIX */}
                      {ans.field_type?.trim()?.toLowerCase() === 'matrix' ? (() => {

                        let matrixValue = ans.value

                        // convert JSON string to object
                        if (typeof matrixValue === 'string') {
                          try {
                            matrixValue = JSON.parse(matrixValue)
                          } catch (e) {
                            console.error('Invalid matrix JSON', e)
                            matrixValue = {}
                          }
                        }

                        return (
                          <div className="space-y-2">

                            {Object.entries(matrixValue || {}).map(
                              ([row, col]) => (

                                <div
                                  key={row}
                                  className="flex justify-between border-b pb-1 text-sm"
                                >

                                  <span className="font-medium text-gray-700">
                                    {row}
                                  </span>

                                  <span className="text-blue-700 font-medium">
                                    {String(col)}
                                  </span>

                                </div>

                              )
                            )}

                          </div>
                        )

                      })() : ans.field_type === 'repeatable_group' ? (
                        <div className="space-y-3">
                          {(ans.value || []).map((group, idx) => (
                            <div key={idx} className="border rounded p-3 bg-white">
                              {Object.entries(group || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm mb-2">
                                  <span className="font-medium text-gray-700">{key}</span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : ['checkbox', 'multiselect'].includes(ans.field_type?.trim()?.toLowerCase()) ? (
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(ans.value) ? ans.value : []).map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{String(ans.value || '-')}</span>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}