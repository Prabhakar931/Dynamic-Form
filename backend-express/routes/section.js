const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/', auth, async (req, res) => {
  const { form_id, title, description, display_order, fields } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // =========================================
    // SECTION VALIDATION
    // =========================================

    if (!title?.trim()) {
      throw new Error('Section title is required')
    }

    // =========================================
    // FIELD VALIDATIONS
    // =========================================

    const fieldKeys = new Set()

    if (fields && fields.length > 0) {
      for (const field of fields) {

        // label required
        if (!field.label?.trim()) {
          throw new Error('Field label is required')
        }

        // field key required
        if (!field.field_key?.trim()) {
          throw new Error(`Field key missing for ${field.label}`)
        }

        // duplicate field key
        if (fieldKeys.has(field.field_key)) {
          throw new Error(`Duplicate field key: ${field.field_key}`)
        }

        fieldKeys.add(field.field_key)

        // option validation
        if (
          ['radio', 'checkbox', 'dropdown', 'multiselect']
            .includes(field.field_type)
        ) {

          if (!field.options || field.options.length === 0) {
            throw new Error(
              `${field.label} requires at least one option`
            )
          }

          for (const opt of field.options) {
            if (!opt.value?.trim()) {
              throw new Error(
                `Option value missing in ${field.label}`
              )
            }
          }
        }

        // matrix validation
        if (field.field_type === 'matrix') {

          if (
            !field.matrix_config ||
            !Array.isArray(field.matrix_config.rows) ||
            !Array.isArray(field.matrix_config.columns)
          ) {
            throw new Error(
              `Invalid matrix config in ${field.label}`
            )
          }

          if (
            field.matrix_config.rows.length === 0 ||
            field.matrix_config.columns.length === 0
          ) {
            throw new Error(
              `${field.label} matrix requires rows and columns`
            )
          }

          const validTypes = ['checkbox', 'number', 'text', 'radio']

          const emptyColumn = field.matrix_config.columns.some(
            col => {
              if (typeof col === 'string') return !col || !col.trim()
              return !col.label || !col.label.trim() || !validTypes.includes(col.type)
            }
          )

          if (emptyColumn) {
            throw new Error(
              `${field.label} matrix columns must have a label and valid type (checkbox/number/text/radio)`
            )
          }

          const emptyRow = field.matrix_config.rows.some(
            row => !row || !row.trim()
          )

          if (emptyRow) {
            throw new Error(
              `${field.label} matrix rows cannot be empty`
            )
          }
        }
      }
    }

    // =========================================
    // CREATE SECTION
    // =========================================

    const sectionResult = await client.query(
      `INSERT INTO form_section
      (form_id, title, description, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        form_id,
        title,
        description || null,
        display_order ?? 0
      ]
    )

    const section = sectionResult.rows[0]

    // =========================================
    // CREATE FIELDS
    // =========================================

    if (fields && fields.length > 0) {

      for (const fieldData of fields) {

        const fieldResult = await client.query(
          `INSERT INTO form_field
          (
            section_id,
            label,
            field_key,
            field_type,
            is_required,
            display_order,
            field_config
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            section.id,
            fieldData.label,
            fieldData.field_key,
            fieldData.field_type,
            fieldData.is_required || false,
            fieldData.display_order ?? 0,
            fieldData.field_config || {}
          ]
        )

        const field = fieldResult.rows[0]

        // =========================================
        // CREATE OPTIONS
        // =========================================

        if (fieldData.options && fieldData.options.length > 0) {

          for (const opt of fieldData.options) {

            await client.query(
              `INSERT INTO field_option
              (field_id, value, label, display_order)
              VALUES ($1, $2, $3, $4)`,
              [
                field.id,
                opt.value,
                opt.label || opt.value,
                opt.display_order ?? 0
              ]
            )
          }
        }

        // =========================================
        // CREATE MATRIX CONFIG
        // =========================================

        if (
          fieldData.field_type === 'matrix' &&
          fieldData.matrix_config
        ) {

          await client.query(
            `INSERT INTO field_matrix_config
            (field_id, rows, columns)
            VALUES ($1, $2, $3)`,
            [
              field.id,
              JSON.stringify(fieldData.matrix_config.rows),
              JSON.stringify(fieldData.matrix_config.columns)
            ]
          )
        }
      }
    }

    await client.query('COMMIT')

    res.status(201).json(section)

  } catch (err) {

    await client.query('ROLLBACK')

    console.error(err)

    res.status(500).json({
      error: err.message
    })

  } finally {
    client.release()
  }
})

router.get('/:id', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT s.*, 
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', ff.id,
              'section_id', ff.section_id,
              'label', ff.label,
              'field_key', ff.field_key,
              'field_type', ff.field_type,
              'is_required', ff.is_required,
              'display_order', ff.display_order,
              'field_config', ff.field_config,

              'options',
              (
                SELECT COALESCE(
                  json_agg(
                    jsonb_build_object(
                      'id', fo.id,
                      'field_id', fo.field_id,
                      'value', fo.value,
                      'label', fo.label,
                      'display_order', fo.display_order
                    )
                  ) FILTER (WHERE fo.id IS NOT NULL),
                  '[]'
                )
                FROM field_option fo
                WHERE fo.field_id = ff.id
              ),

              'matrix_config',
              (
                SELECT jsonb_build_object(
                  'id', fmc.id,
                  'field_id', fmc.field_id,
                  'rows', fmc.rows,
                  'columns', fmc.columns
                )
                FROM field_matrix_config fmc
                WHERE fmc.field_id = ff.id
              )
            )
            ORDER BY ff.display_order
          ) FILTER (WHERE ff.id IS NOT NULL),
          '[]'
        ) as fields

      FROM form_section s
      LEFT JOIN form_field ff
        ON ff.section_id = s.id

      WHERE s.id = $1
      GROUP BY s.id
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Section not found'
      })
    }

    res.json(result.rows[0])

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })
  }
})

router.put('/:id', auth, async (req, res) => {

  const {
    title,
    description,
    display_order
  } = req.body

  try {

    const result = await pool.query(
      `UPDATE form_section
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         display_order = COALESCE($3, display_order)
       WHERE id = $4
       RETURNING *`,
      [
        title,
        description,
        display_order,
        req.params.id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Section not found'
      })
    }

    res.json(result.rows[0])

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })
  }
})

router.delete('/:id', auth, async (req, res) => {

  try {

    const result = await pool.query(
      'DELETE FROM form_section WHERE id = $1',
      [req.params.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Section not found'
      })
    }

    res.status(204).send()

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })
  }
})

module.exports = router