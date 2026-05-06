import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { forms, students, submissions } from '../api'

function FieldRenderer({ field, value, onChange }) {
  const baseClass = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'phone':
      return <input type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.field_config?.placeholder || ''} className={baseClass} required={field.is_required} />

    case 'textarea':
      return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={4} className={baseClass} required={field.is_required} />

    case 'number':
      return <input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass} required={field.is_required} />

    case 'date':
      return <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass} required={field.is_required} />

    case 'dropdown':
      return (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass} required={field.is_required}>
          <option value="">Select...</option>
          {field.options?.map(opt => <option key={opt.id} value={opt.value}>{opt.label || opt.value}</option>)}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map(opt => (
            <label key={opt.id} className="flex items-center gap-2">
              <input type="radio" name={field.field_key} value={opt.value} checked={value === opt.value} onChange={(e) => onChange(e.target.value)} required={field.is_required} />
              <span>{opt.label || opt.value}</span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map(opt => {
            const selected = (value || []).includes(opt.value)
            return (
              <label key={opt.id} className="flex items-center gap-2">
                <input type="checkbox" checked={selected} onChange={(e) => {
                  const newVals = e.target.checked ? [...(value || []), opt.value] : (value || []).filter(v => v !== opt.value)
                  onChange(newVals)
                }} />
                <span>{opt.label || opt.value}</span>
              </label>
            )
          })}
        </div>
      )

    case 'multiselect':
      return (
        <select multiple value={value || []} onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, o => o.value)
          onChange(selected)
        }} className={`${baseClass} min-h-[120px]`}>
          {field.options?.map(opt => <option key={opt.id} value={opt.value}>{opt.label || opt.value}</option>)}
        </select>
      )

    case 'rating':
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => onChange(n)} className={`w-10 h-10 rounded-full border-2 ${parseInt(value) === n ? 'bg-yellow-400 border-yellow-500' : 'border-gray-300 hover:border-yellow-400'} flex items-center justify-center font-bold`}>
              {n}
            </button>
          ))}
        </div>
      )

    case 'matrix':
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-50 text-left"></th>
                {field.matrix_config?.columns?.map((col, idx) => <th key={idx} className="border p-2 bg-gray-50 text-sm">{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {field.matrix_config?.rows?.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border p-2 font-medium text-sm">{row}</td>
                  {field.matrix_config.columns?.map((col, colIdx) => {
                    const cellKey = `${rowIdx}-${colIdx}`
                    return (
                      <td key={colIdx} className="border p-2 text-center">
                        {col.toLowerCase().includes('tick') || col.toLowerCase().includes('check') ? (
                          <input type="checkbox" checked={(value || {})[cellKey] || false} onChange={(e) => onChange({ ...(value || {}), [cellKey]: e.target.checked })} />
                        ) : col.toLowerCase().includes('priority') ? (
                          <select value={(value || {})[cellKey] || ''} onChange={(e) => onChange({ ...(value || {}), [cellKey]: e.target.value })} className="border rounded px-2 py-1 text-sm">
                            <option value="">-</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : (
                          <input type="text" value={(value || {})[cellKey] || ''} onChange={(e) => onChange({ ...(value || {}), [cellKey]: e.target.value })} className="border rounded px-2 py-1 text-sm w-full" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'repeatable_group':
      return <p className="text-gray-500 italic">Repeatable group - not implemented in this demo</p>

    default:
      return <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass} />
  }
}

export default function FormRenderer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [studentsList, setStudentsList] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    forms.getById(id).then(({ data }) => setForm(data))
    students.getAll().then(({ data }) => setStudentsList(data))
  }, [id])

  const handleAnswerChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const buildAnswerPayload = (field, value) => {
    if (value === null || value === undefined || value === '') return { answer_text: null }
    if (typeof value === 'object') return { answer_json: value }
    if (typeof value === 'number') return { answer_number: value, answer_text: String(value) }
    return { answer_text: String(value) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStudent) {
      alert('Please select a student')
      return
    }
    setSubmitting(true)

    const answersPayload = form.sections.flatMap(section =>
      section.fields.map(field => ({
        field_id: field.id,
        ...buildAnswerPayload(field, answers[field.id])
      }))
    )

    await submissions.create({
      form_id: parseInt(id),
      student_id: parseInt(selectedStudent),
      answers: answersPayload,
    })

    alert('Form submitted successfully!')
    navigate('/submissions')
  }

  if (!form) return <p>Loading...</p>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">{form.name}</h2>
        {form.description && <p className="text-gray-600 mt-2">{form.description}</p>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Select a student</option>
            {studentsList.map(s => <option key={s.id} value={s.id}>{s.student_identifier}</option>)}
          </select>
        </div>

        {form.sections.map(section => (
          <div key={section.id} className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <h3 className="text-xl font-semibold mb-1">{section.title}</h3>
            {section.description && <p className="text-gray-600 mb-4 text-sm">{section.description}</p>}

            <div className="space-y-6">
              {section.fields.map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <FieldRenderer field={field} value={answers[field.id]} onChange={(v) => handleAnswerChange(field.id, v)} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium">
          {submitting ? 'Submitting...' : 'Submit Form'}
        </button>
      </form>
    </div>
  )
}
