import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { forms, submissions } from '../api'

function FieldRenderer({ field, value, onChange }) {

  const baseClass =
    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  switch (field.field_type) {

    case 'text':
    case 'email':
    case 'phone':
      return (
        <input
          type={
            field.field_type === 'email'
              ? 'email'
              : field.field_type === 'phone'
              ? 'tel'
              : 'text'
          }
          value={value || ''}
          onChange={(e) => {

            let val = e.target.value

            if (field.field_type === 'phone') {
              val = val.replace(/\D/g, '').slice(0, 10)
            }

            onChange(val)
          }}
          placeholder={
            field.field_type === 'phone'
              ? 'Enter 10 digit mobile number'
              : field.field_config?.placeholder || ''
          }
          className={baseClass}
          required={field.is_required}
        />
      )

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={baseClass}
          required={field.is_required}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          min="0"
          step="any"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className={baseClass}
          required={field.is_required}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          required={field.is_required}
        />
      )

    case 'dropdown':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          required={field.is_required}
        >
          <option value="">
            Select...
          </option>

          {field.options?.map((opt) => (
            <option
              key={opt.id}
              value={opt.value}
            >
              {opt.label || opt.value}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-2">

          {field.options?.map((opt) => (

            <label
              key={opt.id}
              className="flex items-center gap-2"
            >
              <input
                type="radio"
                name={field.field_key}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) =>
                  onChange(e.target.value)
                }
              />

              <span>
                {opt.label || opt.value}
              </span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">

          {field.options?.map((opt) => {

            const selected =
              (value || []).includes(opt.value)

            return (
              <label
                key={opt.id}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {

                    const newVals = e.target.checked
                      ? [...(value || []), opt.value]
                      : (value || []).filter(
                          (v) => v !== opt.value
                        )

                    onChange(newVals)
                  }}
                />

                <span>
                  {opt.label || opt.value}
                </span>
              </label>
            )
          })}
        </div>
      )

    case 'multiselect':
      return (
        <select
          multiple
          value={value || []}
          onChange={(e) => {

            const selected = Array.from(
              e.target.selectedOptions,
              (o) => o.value
            )

            onChange(selected)
          }}
          className={`${baseClass} min-h-[120px]`}
        >
          {field.options?.map((opt) => (
            <option
              key={opt.id}
              value={opt.value}
            >
              {opt.label || opt.value}
            </option>
          ))}
        </select>
      )

    case 'rating':
      return (
        <div className="flex gap-2">

          {[1, 2, 3, 4, 5].map((n) => (

            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`w-10 h-10 rounded-full border-2 ${
                parseInt(value) === n
                  ? 'bg-yellow-400 border-yellow-500'
                  : 'border-gray-300 hover:border-yellow-400'
              } flex items-center justify-center font-bold`}
            >
              {n}
            </button>
          ))}
        </div>
      )

    case 'matrix':
      return (
        <div className="overflow-x-auto">

          <table className="min-w-full border border-gray-300">

            <thead>
              <tr>
                <th className="border p-2 bg-gray-50">
                  Question
                </th>

                {field.matrix_config?.columns?.map((col, idx) => {

                  const colLabel = typeof col === 'string' ? col : col.label

                  return (
                    <th
                      key={idx}
                      className="border p-2 bg-gray-50"
                    >
                      {colLabel}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {field.matrix_config?.rows?.map((row, rowIdx) => (

                <tr key={rowIdx}>

                  <td className="border p-2 font-medium">
                    {row}
                  </td>

                  {field.matrix_config?.columns?.map((col, colIdx) => {

                    const colLabel = typeof col === 'string' ? col : col.label
                    const colType = typeof col === 'string' ? 'radio' : (col.type || 'text')
                    const isOldFormat = value?.[row] && typeof value[row] === 'string'

                    const cellValue = isOldFormat
                      ? value?.[row]
                      : value?.[row]?.[colLabel]

                    const handleChange = (newVal) => {
                      if (isOldFormat) {
                        onChange({
                          ...(value || {}),
                          [row]: newVal
                        })
                      } else {
                        onChange({
                          ...(value || {}),
                          [row]: {
                            ...(value?.[row] || {}),
                            [colLabel]: newVal
                          }
                        })
                      }
                    }

                    return (
                      <td
                        key={colIdx}
                        className="border p-2 text-center"
                      >
                        {colType === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={!!cellValue}
                            onChange={(e) =>
                              handleChange(e.target.checked)
                            }
                          />
                        ) : colType === 'number' ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={cellValue ?? ''}
                            onChange={(e) =>
                              handleChange(Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                        ) : colType === 'radio' ? (
                          <input
                            type="radio"
                            name={`${field.field_key}_${row}`}
                            checked={cellValue === colLabel}
                            onChange={() =>
                              handleChange(colLabel)
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            value={cellValue ?? ''}
                            onChange={(e) =>
                              handleChange(e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
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
      return (
        <div className="space-y-4">

          {(value || []).map((groupItem, index) => (

            <div
              key={index}
              className="border rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-center mb-4">

                <h4 className="font-medium">
                  Item {index + 1}
                </h4>

                <button
                  type="button"
                  onClick={() => {

                    const updated = [...(value || [])]

                    updated.splice(index, 1)

                    onChange(updated)
                  }}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-4">

                {(field.field_config?.fields || []).map((subField) => (

                  <div key={subField.field_key}>

                    <label className="block text-sm font-medium mb-2">

                      {subField.label}

                      {subField.is_required && (
                        <span className="text-red-500 ml-1">
                          *
                        </span>
                      )}
                    </label>

                    <input
                      type="text"
                      value={
                        groupItem[subField.field_key] || ''
                      }
                      onChange={(e) => {

                        const updated = [...(value || [])]

                        updated[index] = {
                          ...updated[index],
                          [subField.field_key]: e.target.value
                        }

                        onChange(updated)
                      }}
                      className={baseClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {

              onChange([
                ...(value || []),
                {}
              ])
            }}
            className="px-4 py-2 border rounded-lg text-blue-600 hover:bg-blue-50"
          >
            + Add Item
          </button>
        </div>
      )

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className={baseClass}
        />
      )
  }
}

export default function FormRenderer() {

  const { id } = useParams()

  const navigate = useNavigate()

  const [form, setForm] = useState(null)

  const [answers, setAnswers] = useState({})

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {

    forms.getById(id)
      .then(({ data }) => setForm(data))

  }, [id])

  const handleAnswerChange = (fieldId, value) => {

    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const buildAnswerPayload = (field, value) => {

    if (
      value === null ||
      value === undefined ||
      (
        typeof value === 'string' &&
        value.trim() === ''
      )
    ) {
      return {
        answer_text: null
      }
    }

    if (
      typeof value === 'object' &&
      value !== null
    ) {
      return {
        answer_json: value
      }
    }

    if (typeof value === 'number') {
      return {
        answer_number: value,
        answer_text: String(value)
      }
    }

    return {
      answer_text: String(value)
    }
  }

  const validateForm = () => {

    for (const section of form.sections) {

      for (const field of section.fields) {

        const value = answers[field.id]

        // PHONE VALIDATION
        if (
          field.field_type === 'phone' &&
          value &&
          !/^[0-9]{10}$/.test(value)
        ) {
          alert(
            `${field.label} must be a valid 10 digit mobile number`
          )

          return false
        }

        // EMAIL VALIDATION
        if (
          field.field_type === 'email' &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          alert(
            `${field.label} must be a valid email`
          )

          return false
        }

        // MATRIX VALIDATION
        if (
          field.field_type === 'matrix' &&
          field.is_required
        ) {

          const matrixAnswers = value || {}

          const rows =
            field.matrix_config?.rows || []
          const columns =
            field.matrix_config?.columns || []

          const isOldFormat = rows.some(
            row => matrixAnswers[row] && typeof matrixAnswers[row] === 'string'
          )

          if (isOldFormat) {

            for (const row of rows) {

              if (
                !matrixAnswers[row] ||
                String(matrixAnswers[row]).trim() === ''
              ) {
                alert(
                  `${field.label}: ${row} is required`
                )

                return false
              }
            }

          } else {

            for (const row of rows) {

              for (const col of columns) {

                const colLabel = typeof col === 'string' ? col : col.label
                const colType = typeof col === 'string' ? 'radio' : col.type
                const cellValue = matrixAnswers?.[row]?.[colLabel]

                if (colType === 'checkbox') continue

                if (
                  cellValue === undefined ||
                  cellValue === null ||
                  cellValue === ''
                ) {
                  alert(
                    `${field.label}: ${row} - ${colLabel} is required`
                  )

                  return false
                }
              }
            }
          }
        }

        // REPEATABLE GROUP VALIDATION
        if (
          field.field_type === 'repeatable_group'
        ) {

          const groups = value || []

          if (
            field.is_required &&
            groups.length === 0
          ) {
            alert(
              `${field.label} requires at least one item`
            )

            return false
          }

          for (const item of groups) {

            for (
              const subField of
              field.field_config?.fields || []
            ) {

              const subValue =
                item[subField.field_key]

              if (
                subField.is_required &&
                (
                  subValue === undefined ||
                  subValue === null ||
                  String(subValue).trim() === ''
                )
              ) {
                alert(
                  `${subField.label} is required in ${field.label}`
                )

                return false
              }
            }
          }
        }

        if (!field.is_required) continue

        // EMPTY STRING
        if (
          value === undefined ||
          value === null ||
          (
            typeof value === 'string' &&
            value.trim() === ''
          )
        ) {
          alert(`${field.label} is required`)
          return false
        }

        // EMPTY ARRAY
        if (
          Array.isArray(value) &&
          value.length === 0
        ) {
          alert(`${field.label} is required`)
          return false
        }

        // EMPTY OBJECT
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0
        ) {
          alert(`${field.label} is required`)
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    if (submitting) return

    if (!validateForm()) return

    setSubmitting(true)

    try {

      const answersPayload =
        form.sections.flatMap((section) =>
          section.fields.map((field) => ({

            field_id: field.id,

            ...buildAnswerPayload(
              field,
              answers[field.id]
            )
          }))
        )

      await submissions.create({
        form_id: parseInt(id),
        answers: answersPayload
      })

      alert('Form submitted successfully!')

      navigate('/forms')

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Submission failed'
      )

    } finally {

      setSubmitting(false)
    }
  }

  if (!form) {
    return <p>Loading...</p>
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="mb-8">

        <h2 className="text-3xl font-bold">
          {form.name}
        </h2>

        {form.description && (
          <p className="text-gray-600 mt-2">
            {form.description}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>

        {form.sections.map((section) => (

          <div
            key={section.id}
            className="bg-white p-6 rounded-lg shadow-sm border mb-6"
          >

            <h3 className="text-xl font-semibold mb-1">
              {section.title}
            </h3>

            {section.description && (
              <p className="text-gray-600 mb-4 text-sm">
                {section.description}
              </p>
            )}

            <div className="space-y-6">

              {section.fields.map((field) => (

                <div key={field.id}>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    {field.label}

                    {field.is_required && (
                      <span className="text-red-500 ml-1">
                        *
                      </span>
                    )}
                  </label>

                  <FieldRenderer
                    field={field}
                    value={answers[field.id]}
                    onChange={(v) =>
                      handleAnswerChange(
                        field.id,
                        v
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {submitting
            ? 'Submitting...'
            : 'Submit Form'}
        </button>
      </form>
    </div>
  )
}