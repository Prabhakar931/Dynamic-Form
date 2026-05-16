import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { forms, organisations } from '../api'

const FIELD_TYPES = [
  'text', 'textarea', 'number', 'email', 'phone',
  'dropdown', 'checkbox', 'multiselect', 'radio',
  'date', 'matrix', 'rating', 'repeatable_group'
]

function SectionBuilder({ section, onUpdate, onDelete, index }) {

  const updateField = (fieldIdx, fieldData) => {
    const newFields = [...section.fields]
    newFields[fieldIdx] = { ...newFields[fieldIdx], ...fieldData }
    onUpdate({ ...section, fields: newFields })
  }

  const addField = () => {
    onUpdate({
      ...section,
      fields: [
        ...section.fields,
        {
          label: '',
          field_key: '',
          field_type: 'text',
          is_required: false,
          display_order: section.fields.length + 1,
          field_config: {},
          options: [],
          matrix_config: {
            rows: [],
            columns: []
          }
        }
      ]
    })
  }

  const removeField = (idx) => {
    const newFields = section.fields.filter((_, i) => i !== idx)

    // re-order display order
    const reordered = newFields.map((f, index) => ({
      ...f,
      display_order: index + 1
    }))

    onUpdate({
      ...section,
      fields: reordered
    })
  }

  const addOption = (fieldIdx) => {
    const field = section.fields[fieldIdx]

    updateField(fieldIdx, {
      options: [
        ...field.options,
        {
          value: '',
          label: '',
          display_order: field.options.length + 1
        }
      ]
    })
  }

  const updateOption = (fieldIdx, optIdx, optData) => {
    const field = section.fields[fieldIdx]
    const newOpts = [...field.options]

    newOpts[optIdx] = {
      ...newOpts[optIdx],
      ...optData
    }

    updateField(fieldIdx, { options: newOpts })
  }

  const removeOption = (fieldIdx, optIdx) => {
    const field = section.fields[fieldIdx]

    const reordered = field.options
      .filter((_, i) => i !== optIdx)
      .map((opt, index) => ({
        ...opt,
        display_order: index + 1
      }))

    updateField(fieldIdx, { options: reordered })
  }

  const addMatrixRow = (fieldIdx) => {
    const field = section.fields[fieldIdx]

    const newRows = [
      ...(field.matrix_config?.rows || []),
      ''
    ]

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        rows: newRows
      }
    })
  }

  const updateMatrixRow = (fieldIdx, idx, value) => {
    const field = section.fields[fieldIdx]

    const newRows = [...(field.matrix_config?.rows || [])]
    newRows[idx] = value

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        rows: newRows
      }
    })
  }

  const removeMatrixRow = (fieldIdx, idx) => {
    const field = section.fields[fieldIdx]

    const newRows = (field.matrix_config?.rows || [])
      .filter((_, i) => i !== idx)

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        rows: newRows
      }
    })
  }

  const addMatrixColumn = (fieldIdx) => {
    const field = section.fields[fieldIdx]

    const newCols = [
      ...(field.matrix_config?.columns || []),
      ''
    ]

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        columns: newCols
      }
    })
  }

  const updateMatrixColumn = (fieldIdx, idx, value) => {
    const field = section.fields[fieldIdx]

    const newCols = [...(field.matrix_config?.columns || [])]
    newCols[idx] = value

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        columns: newCols
      }
    })
  }

  const removeMatrixColumn = (fieldIdx, idx) => {
    const field = section.fields[fieldIdx]

    const newCols = (field.matrix_config?.columns || [])
      .filter((_, i) => i !== idx)

    updateField(fieldIdx, {
      matrix_config: {
        ...field.matrix_config,
        columns: newCols
      }
    })
  }

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">
          Section {index + 1}
        </h3>

        <button
          type="button"
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove Section
        </button>
      </div>

      <div className="grid gap-4 mb-4">

        <input
          type="text"
          value={section.title}
          onChange={(e) =>
            onUpdate({
              ...section,
              title: e.target.value
            })
          }
          placeholder="Section title"
          className="px-4 py-2 border rounded-lg"
        />

        <input
          type="text"
          value={section.description || ''}
          onChange={(e) =>
            onUpdate({
              ...section,
              description: e.target.value
            })
          }
          placeholder="Section description (optional)"
          className="px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="space-y-4">

        {section.fields.map((field, fieldIdx) => (

          <div key={fieldIdx} className="bg-white border rounded-lg p-4">

            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">
                Field {fieldIdx + 1}
              </span>

              <button
                type="button"
                onClick={() => removeField(fieldIdx)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">

              <input
                type="text"
                value={field.label}
                onChange={(e) => {

                  const newLabel = e.target.value

                  const generatedKey = newLabel
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '')

                  updateField(fieldIdx, {
                    label: newLabel,
                    field_key: generatedKey
                  })
                }}
                placeholder="Label"
                className="px-3 py-2 border rounded"
              />

              <input
                type="text"
                value={field.field_key}
                onChange={(e) =>
                  updateField(fieldIdx, {
                    field_key: e.target.value
                  })
                }
                placeholder="Field key"
                className="px-3 py-2 border rounded"
              />

            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">

              <select
                value={field.field_type}
                onChange={(e) =>
                  updateField(fieldIdx, {
                    field_type: e.target.value
                  })
                }
                className="px-3 py-2 border rounded"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={field.is_required}
                  onChange={(e) =>
                    updateField(fieldIdx, {
                      is_required: e.target.checked
                    })
                  }
                />

                <span className="text-sm">
                  Required
                </span>
              </label>

              <input
                type="number"
                value={field.display_order || ''}
                onChange={(e) =>
                  updateField(fieldIdx, {
                    display_order: parseInt(e.target.value) || 1
                  })
                }
                placeholder="Display order"
                className="px-3 py-2 border rounded"
              />
            </div>

            {['dropdown', 'checkbox', 'multiselect', 'radio'].includes(field.field_type) && (

              <div className="mt-3 border-t pt-3">

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Options
                  </span>

                  <button
                    type="button"
                    onClick={() => addOption(fieldIdx)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Option
                  </button>
                </div>

                {field.options.map((opt, optIdx) => (

                  <div key={optIdx} className="flex gap-2 mb-2">

                    <input
                      type="text"
                      value={opt.value}
                      onChange={(e) =>
                        updateOption(fieldIdx, optIdx, {
                          value: e.target.value
                        })
                      }
                      placeholder="Value"
                      className="flex-1 px-3 py-1 border rounded text-sm"
                    />

                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) =>
                        updateOption(fieldIdx, optIdx, {
                          label: e.target.value
                        })
                      }
                      placeholder="Label"
                      className="flex-1 px-3 py-1 border rounded text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => removeOption(fieldIdx, optIdx)}
                      className="text-red-600 hover:text-red-800"
                    >
                      &times;
                    </button>

                  </div>
                ))}
              </div>
            )}

            {field.field_type === 'matrix' && (

              <div className="mt-3 border-t pt-3">

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Rows
                      </span>

                      <button
                        type="button"
                        onClick={() => addMatrixRow(fieldIdx)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add
                      </button>
                    </div>

                    {(field.matrix_config?.rows || []).map((row, idx) => (

                      <div key={idx} className="flex gap-2 mb-2">

                        <input
                          type="text"
                          value={row}
                          onChange={(e) =>
                            updateMatrixRow(fieldIdx, idx, e.target.value)
                          }
                          placeholder="Row value"
                          className="flex-1 px-3 py-1 border rounded text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => removeMatrixRow(fieldIdx, idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          &times;
                        </button>

                      </div>
                    ))}
                  </div>

                  <div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Columns
                      </span>

                      <button
                        type="button"
                        onClick={() => addMatrixColumn(fieldIdx)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add
                      </button>
                    </div>

                    {(field.matrix_config?.columns || []).map((col, idx) => (

                      <div key={idx} className="flex gap-2 mb-2">

                        <input
                          type="text"
                          value={col}
                          onChange={(e) =>
                            updateMatrixColumn(fieldIdx, idx, e.target.value)
                          }
                          placeholder="Column value"
                          className="flex-1 px-3 py-1 border rounded text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => removeMatrixColumn(fieldIdx, idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          &times;
                        </button>

                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600"
      >
        + Add Field
      </button>
    </div>
  )
}

export default function FormBuilder() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [orgs, setOrgs] = useState([])

  const [formData, setFormData] = useState({
    organisation_id: '',
    name: '',
    description: '',
    status: 'DRAFT',
    sections: []
  })

  useEffect(() => {

    organisations.getAll()
      .then(({ data }) => setOrgs(data))

    if (id) {
      forms.getById(id).then(({ data }) => {

        if (data.submission_count > 0) {
          alert('Cannot edit a form that has submissions')
          navigate('/forms')
          return
        }

        setFormData({
          organisation_id: data.organisation_id,
          name: data.name,
          description: data.description || '',
          status: data.status,
          sections: data.sections || []
        })
      })
    }

  }, [id])

  const addSection = () => {

    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          title: '',
          description: '',
          display_order: formData.sections.length + 1,
          fields: []
        }
      ]
    })
  }

  const updateSection = (idx, section) => {

    const newSections = [...formData.sections]
    newSections[idx] = section

    setFormData({
      ...formData,
      sections: newSections
    })
  }

  const removeSection = (idx) => {

    const reordered = formData.sections
      .filter((_, i) => i !== idx)
      .map((section, index) => ({
        ...section,
        display_order: index + 1
      }))

    setFormData({
      ...formData,
      sections: reordered
    })
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    // SECTION VALIDATION
    if (formData.sections.length === 0) {
      alert('Please add at least one section')
      return
    }

    // FIELD VALIDATION
    const totalFields = formData.sections.reduce(
      (count, section) => count + section.fields.length,
      0
    )

    if (totalFields === 0) {
      alert('Form must contain at least one field')
      return
    }

    const optionFieldTypes = [
      'dropdown',
      'checkbox',
      'multiselect',
      'radio'
    ]

    for (const section of formData.sections) {

      for (const field of section.fields) {

        if (!field.label.trim()) {
          alert('Every field must have a label')
          return
        }

        if (!field.field_key.trim()) {
          alert(`Field key missing for "${field.label}"`)
          return
        }

        // OPTION VALIDATION
        if (optionFieldTypes.includes(field.field_type)) {

          if (!field.options || field.options.length === 0) {
            alert(`${field.label} requires at least one option`)
            return
          }

          const invalidOption = field.options.some(
            opt => !opt.value.trim() || !opt.label.trim()
          )

          if (invalidOption) {
            alert(`All options in "${field.label}" must have value and label`)
            return
          }
        }

        // MATRIX VALIDATION
        if (field.field_type === 'matrix') {

          const rows = field.matrix_config?.rows || []
          const columns = field.matrix_config?.columns || []

          if (rows.length === 0 || columns.length === 0) {
            alert(`${field.label} matrix must contain rows and columns`)
            return
          }

          if (
            rows.some(r => !r.trim()) ||
            columns.some(c => !c.trim())
          ) {
            alert(`${field.label} matrix rows/columns cannot be empty`)
            return
          }
        }
      }
    }

    // DUPLICATE FIELD KEY CHECK
    const allKeys = formData.sections.flatMap(section =>
      section.fields.map(field => field.field_key.trim())
    )

    const duplicateKeys = allKeys.filter(
      (key, idx) => allKeys.indexOf(key) !== idx
    )

    if (duplicateKeys.length > 0) {
      alert(`Duplicate field key found: ${duplicateKeys[0]}`)
      return
    }

    const data = {
      ...formData,
      organisation_id: parseInt(formData.organisation_id),
    }

    try {

      if (id) {

        await forms.update(id, {
          name: data.name,
          description: data.description,
          status: data.status
        })

        alert('Form updated!')

      } else {

        await forms.create(data)
        alert('Form created!')
      }

      navigate('/forms')

    } catch (err) {

      console.error(err)

      alert(
        err.response?.data?.error ||
        'Something went wrong'
      )
    }
  }

  return (
    <div>

      <h2 className="text-2xl font-bold mb-6">
        {id ? 'Edit Form' : 'Create Form'}
      </h2>

      <form onSubmit={handleSubmit} className="mb-8">

        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">

          <div className="grid grid-cols-2 gap-4 mb-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organisation
              </label>

              <select
                value={formData.organisation_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organisation_id: e.target.value
                  })
                }
                required
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">
                  Select organisation
                </option>

                {orgs.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>

              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="PUBLISHED">
                  Published
                </option>
              </select>
            </div>
          </div>

          <div className="mb-4">

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Name
            </label>

            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value
                })
              }
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>

            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value
                })
              }
              rows={3}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="mb-6">

          {formData.sections.map((section, idx) => (

            <SectionBuilder
              key={idx}
              section={section}
              index={idx}
              onUpdate={(s) => updateSection(idx, s)}
              onDelete={() => removeSection(idx)}
            />
          ))}

          <button
            type="button"
            onClick={addSection}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Section
          </button>
        </div>

        <div className="flex gap-4">

          <button
            type="submit"
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {id ? 'Update Form' : 'Create Form'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/forms')}
            className="px-8 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>

        </div>
      </form>
    </div>
  )
}