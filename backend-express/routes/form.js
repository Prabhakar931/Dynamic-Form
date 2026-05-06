const express = require('express')
const pool = require('../db')
const router = express.Router()

const getFormQuery = `
  SELECT f.*, 
    COALESCE(json_agg(
      DISTINCT jsonb_build_object(
        'id', s.id,
        'form_id', s.form_id,
        'title', s.title,
        'description', s.description,
        'display_order', s.display_order,
        'fields', (
          SELECT COALESCE(json_agg(
            jsonb_build_object(
              'id', ff.id,
              'section_id', ff.section_id,
              'label', ff.label,
              'field_key', ff.field_key,
              'field_type', ff.field_type,
              'is_required', ff.is_required,
              'display_order', ff.display_order,
              'field_config', ff.field_config,
              'options', (
                SELECT COALESCE(json_agg(
                  jsonb_build_object('id', fo.id, 'field_id', fo.field_id, 'value', fo.value, 'label', fo.label, 'display_order', fo.display_order)
                ) FILTER (WHERE fo.id IS NOT NULL), '[]')
                FROM field_option fo WHERE fo.field_id = ff.id
              ),
              'matrix_config', (
                SELECT jsonb_build_object('id', fmc.id, 'field_id', fmc.field_id, 'rows', fmc.rows, 'columns', fmc.columns)
                FROM field_matrix_config fmc WHERE fmc.field_id = ff.id
              )
            )
          ) FILTER (WHERE ff.id IS NOT NULL), '[]')
          FROM form_field ff WHERE ff.section_id = s.id
        )
      )
    ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections
  FROM form f
  LEFT JOIN form_section s ON s.form_id = f.id
  LEFT JOIN form_field ff ON ff.section_id = s.id
  WHERE f.id = $1
  GROUP BY f.id
`

router.post('/', async (req, res) => {
  const { organisation_id, name, description, status, sections } = req.body
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const formResult = await client.query(
      'INSERT INTO form (organisation_id, name, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [organisation_id, name, description || null, status || 'DRAFT']
    )
    const form = formResult.rows[0]
    
    if (sections && sections.length > 0) {
      for (const sectionData of sections) {
        const sectionResult = await client.query(
          'INSERT INTO form_section (form_id, title, description, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
          [form.id, sectionData.title, sectionData.description || null, sectionData.display_order]
        )
        const section = sectionResult.rows[0]
        
        if (sectionData.fields && sectionData.fields.length > 0) {
          for (const fieldData of sectionData.fields) {
            const fieldResult = await client.query(
              'INSERT INTO form_field (section_id, label, field_key, field_type, is_required, display_order, field_config) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
              [section.id, fieldData.label, fieldData.field_key, fieldData.field_type, fieldData.is_required || false, fieldData.display_order, fieldData.field_config || {}]
            )
            const field = fieldResult.rows[0]
            
            if (fieldData.options && fieldData.options.length > 0) {
              for (const opt of fieldData.options) {
                await client.query(
                  'INSERT INTO field_option (field_id, value, label, display_order) VALUES ($1, $2, $3, $4)',
                  [field.id, opt.value, opt.label, opt.display_order]
                )
              }
            }
            
            if (fieldData.field_type === 'matrix' && fieldData.matrix_config) {
              await client.query(
                'INSERT INTO field_matrix_config (field_id, rows, columns) VALUES ($1, $2, $3)',
                [field.id, fieldData.matrix_config.rows, fieldData.matrix_config.columns]
              )
            }
          }
        }
      }
    }
    
    await client.query('COMMIT')
    
    const formWithDetails = await client.query(getFormQuery, [form.id])
    res.status(201).json(formWithDetails.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.get('/', async (req, res) => {
  const { organisation_id } = req.query
  try {
    let query = `
      SELECT f.*, 
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', s.id, 'form_id', s.form_id, 'title', s.title, 'description', s.description, 'display_order', s.display_order,
            'fields', (
              SELECT COALESCE(json_agg(
                jsonb_build_object(
                  'id', ff.id, 'section_id', ff.section_id, 'label', ff.label, 'field_key', ff.field_key, 'field_type', ff.field_type, 'is_required', ff.is_required, 'display_order', ff.display_order, 'field_config', ff.field_config,
                  'options', (SELECT COALESCE(json_agg(jsonb_build_object('id', fo.id, 'field_id', fo.field_id, 'value', fo.value, 'label', fo.label, 'display_order', fo.display_order)) FILTER (WHERE fo.id IS NOT NULL), '[]') FROM field_option fo WHERE fo.field_id = ff.id),
                  'matrix_config', (SELECT jsonb_build_object('id', fmc.id, 'field_id', fmc.field_id, 'rows', fmc.rows, 'columns', fmc.columns) FROM field_matrix_config fmc WHERE fmc.field_id = ff.id)
                )
              ) FILTER (WHERE ff.id IS NOT NULL), '[]')
              FROM form_field ff WHERE ff.section_id = s.id
            )
          )
        ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections
      FROM form f
      LEFT JOIN form_section s ON s.form_id = f.id
      LEFT JOIN form_field ff ON ff.section_id = s.id
    `
    const params = []
    if (organisation_id) {
      query += ' WHERE f.organisation_id = $1'
      params.push(organisation_id)
    }
    query += ' GROUP BY f.id ORDER BY f.id'
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(getFormQuery, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Form not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, description, status } = req.body
  try {
    const result = await pool.query(
      'UPDATE form SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3, status) WHERE id = $4 RETURNING *',
      [name, description, status, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Form not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM form WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Form not found' })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
