const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/', auth, async (req, res) => {
  const { name } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO organisation (name) VALUES ($1) RETURNING *',
      [name]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organisation ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organisation WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organisation not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  const { name } = req.body
  try {
    const result = await pool.query(
      'UPDATE organisation SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organisation not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM organisation WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Organisation not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
