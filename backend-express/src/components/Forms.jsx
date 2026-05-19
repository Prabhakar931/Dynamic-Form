import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forms, organisations, submissions } from '../api'

function SubmissionIcon() {
  return (
    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

export default function Forms() {

  const navigate = useNavigate()

  const [formsList, setForms] = useState([])
  const [orgs, setOrgs] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState(null)
  const [formSubmissions, setFormSubmissions] = useState([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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

  const handleViewSubmissions = async (form) => {
    setSelectedForm(form)
    setShowModal(true)
    setLoadingSubmissions(true)
    try {
      const { data } = await forms.getSubmissions(form.id)
      setFormSubmissions(data || [])
    } catch (err) {
      console.error(err)
      setFormSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const handleViewDetail = async (submissionId) => {
    setLoadingDetail(true)
    setShowDetailModal(true)
    try {
      const { data } = await submissions.getById(submissionId)
      setDetailData(data)
    } catch (err) {
      console.error(err)
      alert('Failed to load submission details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDeleteSubmission = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this submission?')) return
    try {
      await submissions.delete(id)
      setFormSubmissions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete submission')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const renderValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') return <span className="text-gray-400 italic">No answer</span>
    if (fieldType === 'checkbox' || fieldType === 'multiselect') {
      const items = Array.isArray(value) ? value : []
      if (items.length === 0) return <span className="text-gray-400 italic">None selected</span>
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item, i) => (
            <span key={i} className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              {item}
            </span>
          ))}
        </div>
      )
    }
    if (typeof value === 'object') {
      return <pre className="text-sm bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
    }
    return <span>{String(value)}</span>
  }

  return (
    <div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Forms</h2>
        <Link
          to="/forms/new"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <option value="">All Organisations</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {formsList.length === 0 ? (
          <div className="bg-white p-10 rounded-lg border text-center">
            <p className="text-gray-500">No forms yet. Create one to get started.</p>
          </div>
        ) : (
          formsList.map((form) => (
            <div
              key={form.id}
              className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{form.name}</h3>
                  {form.description && (
                    <p className="text-gray-600 mt-1">{form.description}</p>
                  )}
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>Sections: {form.sections?.length || 0}</span>
                    <span>
                      Status:
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        form.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {form.status}
                      </span>
                    </span>
                    <span>Submissions: {form.submission_count ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {form.submission_count > 0 ? (
                    <span
                      title="Cannot edit: form has submissions"
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-400 rounded cursor-not-allowed"
                    >
                      Edit
                    </span>
                  ) : (
                    <Link
                      to={`/forms/${form.id}/edit`}
                      className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Edit
                    </Link>
                  )}

                  {form.status === 'PUBLISHED' && (form.sections?.length || 0) > 0 && (
                    <>
                      <Link
                        to={`/forms/${form.id}/render`}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        View Form
                      </Link>

                      <button
                        onClick={() => handleViewSubmissions(form)}
                        className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        View Submissions
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(form.id)}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============ SUBMISSIONS LIST MODAL ============ */}
      {showModal && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{selectedForm.name}</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {formSubmissions.length} {formSubmissions.length === 1 ? 'submission' : 'submissions'}
                </span>
              </div>
              <button
                onClick={() => { setShowModal(false); setFormSubmissions([]) }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingSubmissions ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
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
                  ))}
                </div>
              ) : formSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <SubmissionIcon />
                  <p className="mt-4 text-lg font-medium text-gray-500">No submissions yet</p>
                  <p className="mt-1 text-sm">This form has not received any submissions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="group border border-gray-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            #{submission.id}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              Submission #{submission.id}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(submission.submitted_at)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {submission.answer_count > 0
                                ? `${submission.answer_count} answers`
                                : 'No answers'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewDetail(submission.id)}
                            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => handleDeleteSubmission(e, submission.id)}
                            className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ SUBMISSION DETAIL MODAL ============ */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">
                  Submission #{detailData?.submission?.id || ''}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {detailData?.submission?.form_name} &middot; {formatDate(detailData?.submission?.submitted_at)}
                  {detailData?.sections && (
                    <span> &middot; {detailData.sections.reduce((sum, s) => sum + (s.answers?.length || 0), 0)} answers</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setDetailData(null) }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="space-y-6">
                  {[1,2].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
                      <div className="space-y-3">
                        <div className="h-16 bg-gray-100 rounded-lg" />
                        <div className="h-16 bg-gray-100 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : detailData ? (
                <div className="space-y-6">
                  {detailData.sections?.map((section, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-5 py-3 border-b">
                        <h3 className="font-semibold text-gray-800">{section.title}</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {section.answers?.map((answer, aidx) => (
                          <div key={aidx} className="px-5 py-4">
                            <p className="text-sm font-medium text-gray-600">{answer.label}</p>
                            <div className="mt-1 text-gray-900">
                              {renderValue(answer.value, answer.field_type)}
                            </div>
                          </div>
                        ))}
                        {(!section.answers || section.answers.length === 0) && (
                          <div className="px-5 py-4 text-sm text-gray-400 italic">
                            No answers in this section
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!detailData.sections || detailData.sections.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No sections found for this submission.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load submission details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
