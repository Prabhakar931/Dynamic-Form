const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/:field_id', auth, async (req, res) => {
  const { rows, columns } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO field_matrix_config (field_id, rows, columns) VALUES ($1, $2, $3) RETURNING *',
      [req.params.field_id, rows, columns]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:field_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM field_matrix_config WHERE field_id = $1', [req.params.field_id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Matrix config not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:field_id', auth, async (req, res) => {
  const { rows, columns } = req.body
  try {
    const result = await pool.query(
      'UPDATE field_matrix_config SET rows = COALESCE($1, rows), columns = COALESCE($2, columns) WHERE field_id = $3 RETURNING *',
      [rows, columns, req.params.field_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Matrix config not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:field_id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM field_matrix_config WHERE field_id = $1', [req.params.field_id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Matrix config not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
