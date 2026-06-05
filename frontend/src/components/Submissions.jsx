import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { submissions, forms, students } from '../api'

export default function Submissions () {
  const [submissionsList, setSubmissions] = useState( [] )
  const [formsList, setFormsList] = useState( [] )
  const [studentsList, setStudentsList] = useState( [] )
  const [selectedForm, setSelectedForm] = useState( '' )
  const [selectedStudent, setSelectedStudent] = useState( '' )

  const [selectedSubmission, setSelectedSubmission] = useState( null )
  const [showModal, setShowModal] = useState( false )

  useEffect( () => {
    forms.getAll()
      .then( ( { data } ) => setFormsList( data ) )
      .catch( () => toast.error( 'Failed to load forms' ) )
    students.getAll()
      .then( ( { data } ) => setStudentsList( data ) )
      .catch( () => toast.error( 'Failed to load students' ) )
  }, [] )

  useEffect( () => {
    fetchSubmissions()
  }, [selectedForm, selectedStudent] )

  const fetchSubmissions = async () => {
    try {
      const formId = selectedForm || null
      const studentId = selectedStudent || null
      const { data } = await submissions.getAll( formId, studentId )
      setSubmissions( data )
    } catch ( err ) {
      toast.error( 'Failed to load submissions' )
    }
  }

  const handleDelete = async ( id ) => {
    if ( confirm( 'Delete this submission?' ) ) {
      try {
        await submissions.delete( id )
        toast.success( 'Submission deleted' )
        fetchSubmissions()
      } catch ( err ) {
        toast.error( 'Failed to delete submission' )
      }
    }
  }

  const handleView = async ( id ) => {
    try {
      const { data } = await submissions.getById( id )
      setSelectedSubmission( data )
      setShowModal( true )
    } catch ( err ) {
      toast.error( 'Failed to load submission details' )
    }
  }

  const getFormName = ( formId ) =>
    formsList.find( f => f.id === formId )?.name || 'Unknown'

  const getStudentName = ( studentId ) =>
    studentsList.find( s => s.id === studentId )?.student_identifier || 'Unknown'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Submissions</h2>

      <div className="flex gap-4 mb-6">
        <select
          value={selectedForm}
          onChange={( e ) => setSelectedForm( e.target.value )}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Forms</option>
          {formsList.map( f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ) )}
        </select>

        <select
          value={selectedStudent}
          onChange={( e ) => setSelectedStudent( e.target.value )}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Students</option>
          {studentsList.map( s => (
            <option key={s.id} value={s.id}>
              {s.student_identifier}
            </option>
          ) )}
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
              {submissionsList.map( sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{sub.id}</td>
                  <td className="p-4 font-medium">{getFormName( sub.form_id )}</td>
                  <td className="p-4">{getStudentName( sub.student_id )}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date( sub.submitted_at ).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm">{sub.answers?.length || 0}</td>

                  <td className="p-4 text-right space-x-2">
                    {/* 🔵 VIEW BUTTON */}
                    <button
                      onClick={() => handleView( sub.id )}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </button>

                    {/* 🔴 DELETE BUTTON */}
                    <button
                      onClick={() => handleDelete( sub.id )}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ) )}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔥 MODAL */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-[700px] max-h-[85vh] overflow-y-auto shadow-xl">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {selectedSubmission.submission.form_name}
              </h3>

              <button
                onClick={() => setShowModal( false )}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            {selectedSubmission.sections.map( ( section, sectionIdx ) => (

              <div
                key={sectionIdx}
                className="mb-8 border rounded-lg overflow-hidden"
              >

                <div className="bg-gray-100 px-4 py-3 border-b">
                  <h4 className="font-semibold text-lg">
                    {section.title}
                  </h4>
                </div>

                <div className="p-4 space-y-4">

                  {section.answers.map( ( ans, index ) => (

                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-gray-50"
                    >

                      <div className="font-medium text-gray-800 mb-2">
                        {ans.label}
                      </div>

                      {/* 🔥 REPEATABLE GROUP */}
                      {ans.field_type === 'repeatable_group' &&
                        Array.isArray( ans.answer_json ) ? (

                        <div className="space-y-4">

                          {ans.answer_json.map( ( item, itemIndex ) => (

                            <div
                              key={itemIndex}
                              className="bg-white border rounded-lg p-4"
                            >

                              <div className="font-semibold text-blue-700 mb-3">
                                Person {itemIndex + 1}
                              </div>

                              <div className="space-y-2">

                                {Object.entries( item ).map( ( [key, value] ) => (

                                  <div
                                    key={key}
                                    className="grid grid-cols-[140px_1fr] gap-2"
                                  >

                                    <div className="font-medium text-gray-600 capitalize">
                                      {key.replace( /_/g, ' ' )}
                                    </div>

                                    <div className="text-gray-900">
                                      {String( value )}
                                    </div>

                                  </div>
                                ) )}

                              </div>
                            </div>
                          ) )}

                        </div>

                      ) : Array.isArray( ans.answer_json ) ? (

                        <div className="flex flex-wrap gap-2">
                          {ans.answer_json.map( ( v, i ) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                            >
                              {v}
                            </span>
                          ) )}
                        </div>

                      ) : typeof ans.answer_json === 'object' &&
                        ans.answer_json !== null ? (

                        <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                          {JSON.stringify( ans.answer_json, null, 2 )}
                        </pre>

                      ) : (

                        <div className="text-gray-800">
                          {String( ans.answer_json ?? '' )}
                        </div>

                      )}
                    </div>
                  ) )}

                </div>
              </div>
            ) )}
          </div>
        </div>
      )}
    </div>
  )
}