const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/', auth, async (req, res) => {
  const { field_id, value, label, display_order } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO field_option (field_id, value, label, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [field_id, value, label, display_order]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM field_option WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Option not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  const { value, label, display_order } = req.body
  try {
    const result = await pool.query(
      'UPDATE field_option SET value = COALESCE($1, value), label = COALESCE($2, label), display_order = COALESCE($3, display_order) WHERE id = $4 RETURNING *',
      [value, label, display_order, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Option not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM field_option WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Option not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
