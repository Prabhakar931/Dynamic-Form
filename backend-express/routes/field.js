const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/', auth, async (req, res) => {
  const { section_id, label, field_key, field_type, is_required, display_order, field_config, options, matrix_config } = req.body
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const fieldResult = await client.query(
      'INSERT INTO form_field (section_id, label, field_key, field_type, is_required, display_order, field_config) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [section_id, label, field_key, field_type, is_required || false, display_order, field_config || {}]
    )
    const field = fieldResult.rows[0]
    
    if (options && options.length > 0) {
      for (const opt of options) {
        await client.query(
          'INSERT INTO field_option (field_id, value, label, display_order) VALUES ($1, $2, $3, $4)',
          [field.id, opt.value, opt.label, opt.display_order]
        )
      }
    }
    
    if (field_type === 'matrix' && matrix_config) {
      await client.query(
        'INSERT INTO field_matrix_config (field_id, rows, columns) VALUES ($1, $2, $3)',
        [field.id, matrix_config.rows, matrix_config.columns]
      )
    }
    
    await client.query('COMMIT')
    
    const result = await client.query(`
      SELECT ff.*, 
        (SELECT COALESCE(json_agg(jsonb_build_object('id', fo.id, 'field_id', fo.field_id, 'value', fo.value, 'label', fo.label, 'display_order', fo.display_order)) FILTER (WHERE fo.id IS NOT NULL), '[]') FROM field_option fo WHERE fo.field_id = ff.id) as options,
        (SELECT jsonb_build_object('id', fmc.id, 'field_id', fmc.field_id, 'rows', fmc.rows, 'columns', fmc.columns) FROM field_matrix_config fmc WHERE fmc.field_id = ff.id) as matrix_config
      FROM form_field ff WHERE ff.id = $1
    `, [field.id])
    
    res.status(201).json(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ff.*, 
        (SELECT COALESCE(json_agg(jsonb_build_object('id', fo.id, 'field_id', fo.field_id, 'value', fo.value, 'label', fo.label, 'display_order', fo.display_order)) FILTER (WHERE fo.id IS NOT NULL), '[]') FROM field_option fo WHERE fo.field_id = ff.id) as options,
        (SELECT jsonb_build_object('id', fmc.id, 'field_id', fmc.field_id, 'rows', fmc.rows, 'columns', fmc.columns) FROM field_matrix_config fmc WHERE fmc.field_id = ff.id) as matrix_config
      FROM form_field ff WHERE ff.id = $1
    `, [req.params.id])
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Field not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  const { label, field_key, field_type, is_required, display_order, field_config } = req.body
  try {
    const result = await pool.query(
      'UPDATE form_field SET label = COALESCE($1, label), field_key = COALESCE($2, field_key), field_type = COALESCE($3, field_type), is_required = COALESCE($4, is_required), display_order = COALESCE($5, display_order), field_config = COALESCE($6, field_config) WHERE id = $7 RETURNING *',
      [label, field_key, field_type, is_required, display_order, field_config, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Field not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM form_field WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Field not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
