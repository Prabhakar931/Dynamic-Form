import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { students, organisations } from '../api'

export default function Students() {
  const [studentsList, setStudents] = useState([])
  const [orgs, setOrgs] = useState([])
  const [identifier, setIdentifier] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchOrgs()
    fetchStudents()
  }, [])

  const fetchOrgs = async () => {
    try {
      const { data } = await organisations.getAll()
      setOrgs(data)
    } catch (err) {
      toast.error('Failed to load organisations')
    }
  }

  const fetchStudents = async () => {
    try {
      const { data } = await students.getAll()
      setStudents(data)
    } catch (err) {
      toast.error('Failed to load students')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      toast.error('Please enter a student identifier')
      return
    }

    const payload = {
      student_identifier: identifier,
      organisation_id: selectedOrg ? parseInt(selectedOrg) : null,
    }

    try {
      if (editingId) {
        await students.update(editingId, payload)
        toast.success('Student updated')
        setEditingId(null)
      } else {
        await students.create(payload)
        toast.success('Student created')
      }
      setIdentifier('')
      setSelectedOrg('')
      fetchStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save student')
    }
  }

  const handleEdit = (student) => {
    setEditingId(student.id)
    setIdentifier(student.student_identifier)
    setSelectedOrg(student.organisation_id || '')
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this student?')) {
      try {
        await students.delete(id)
        toast.success('Student deleted')
        fetchStudents()
      } catch (err) {
        toast.error('Failed to delete student')
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIdentifier('')
    setSelectedOrg('')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Students</h2>

      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Student identifier"
            className="px-4 py-2 border rounded-lg"
            required
          />
          <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">No organisation</option>
            {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border">
        {studentsList.length === 0 ? (
          <p className="p-6 text-gray-500">No students yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Identifier</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Organisation</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {studentsList.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{s.id}</td>
                  <td className="p-4 font-medium">{s.student_identifier}</td>
                  <td className="p-4 text-sm text-gray-600">{orgs.find(o => o.id === s.organisation_id)?.name || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(s)} className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
