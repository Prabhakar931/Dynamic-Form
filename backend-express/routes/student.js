const express = require('express')
const pool = require('../db')
const router = express.Router()

router.post('/', async (req, res) => {
  const { student_identifier, organisation_id } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO student (student_identifier, organisation_id) VALUES ($1, $2) RETURNING *',
      [student_identifier, organisation_id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  const { organisation_id } = req.query
  try {
    let query = 'SELECT * FROM student'
    const params = []
    if (organisation_id) {
      query += ' WHERE organisation_id = $1'
      params.push(organisation_id)
    }
    query += ' ORDER BY id'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM student WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  const { student_identifier, organisation_id } = req.body
  try {
    const result = await pool.query(
      'UPDATE student SET student_identifier = COALESCE($1, student_identifier), organisation_id = COALESCE($2, organisation_id) WHERE id = $3 RETURNING *',
      [student_identifier, organisation_id, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM student WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
