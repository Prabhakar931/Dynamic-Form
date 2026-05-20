const express = require('express')
const pool = require('../db')
const router = express.Router()

const getFormQuery = `
  SELECT f.*,
    (SELECT COUNT(*) FROM form_submission WHERE form_id = f.id)::int as submission_count,
    COALESCE(json_agg(
      jsonb_build_object(
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
                  jsonb_build_object(
                    'id', fo.id,
                    'field_id', fo.field_id,
                    'value', fo.value,
                    'label', fo.label,
                    'display_order', fo.display_order
                  )
                ) FILTER (WHERE fo.id IS NOT NULL), '[]')
                FROM field_option fo
                WHERE fo.field_id = ff.id
              ),
              'matrix_config', (
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
          ) FILTER (WHERE ff.id IS NOT NULL), '[]')
          FROM form_field ff
          WHERE ff.section_id = s.id
        )
      )
      ORDER BY s.display_order
    ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections
  FROM form f
  LEFT JOIN form_section s ON s.form_id = f.id
  WHERE f.id = $1
  GROUP BY f.id
`

// =========================
// CREATE FORM
// =========================
router.post('/', async (req, res) => {

  const {
    organisation_id,
    name,
    description,
    status,
    sections
  } = req.body

  // =========================
  // VALIDATIONS
  // =========================

  // Must contain at least one section
  if (!sections || sections.length === 0) {
    return res.status(400).json({
      error: 'Form must contain at least one section'
    })
  }

  // Must contain at least one field
  const totalFields = sections.reduce(
    (acc, section) => acc + (section.fields?.length || 0),
    0
  )

  if (totalFields === 0) {
    return res.status(400).json({
      error: 'Form must contain at least one field'
    })
  }

  // Prevent publishing empty form
  if (status === 'PUBLISHED' && totalFields === 0) {
    return res.status(400).json({
      error: 'Cannot publish form without fields'
    })
  }

  const fieldKeys = []

  const optionFields = [
    'radio',
    'checkbox',
    'dropdown',
    'multiselect'
  ]

  for (const section of sections) {

    for (const field of section.fields || []) {

      // =========================
      // FIELD KEY VALIDATION
      // =========================

      if (!field.field_key || field.field_key.trim() === '') {
        return res.status(400).json({
          error: `Field key missing for ${field.label || 'Unnamed Field'}`
        })
      }

      // ✅ NORMALIZE FIELD KEY
      const normalizedKey = field.field_key
        .trim()
        .toLowerCase()

      // ✅ FIELD KEY FORMAT VALIDATION
      const keyRegex = /^[a-z0-9_]+$/

      if (!keyRegex.test(normalizedKey)) {
        return res.status(400).json({
          error: `Invalid field key: ${field.field_key}`
        })
      }

      // ✅ CASE-INSENSITIVE DUPLICATE CHECK
      if (fieldKeys.includes(normalizedKey)) {
        return res.status(400).json({
          error: `Duplicate field key: ${field.field_key}`
        })
      }

      fieldKeys.push(normalizedKey)

      // =========================
      // LABEL VALIDATION
      // =========================

      if (!field.label || field.label.trim() === '') {
        return res.status(400).json({
          error: 'Every field must contain a label'
        })
      }

      // =========================
      // OPTIONS VALIDATION
      // =========================

      if (optionFields.includes(field.field_type)) {

        if (!field.options || field.options.length === 0) {
          return res.status(400).json({
            error: `${field.label} requires at least one option`
          })
        }

        for (const option of field.options) {

          if (
            !option.value ||
            option.value.trim() === '' ||
            !option.label ||
            option.label.trim() === ''
          ) {
            return res.status(400).json({
              error: `Invalid option in ${field.label}`
            })
          }
        }
      }

      // =========================
      // MATRIX VALIDATION
      // =========================

      if (field.field_type === 'matrix') {

        if (
          !field.matrix_config ||
          !Array.isArray(field.matrix_config.rows) ||
          !Array.isArray(field.matrix_config.columns)
        ) {
          return res.status(400).json({
            error: `Invalid matrix configuration in ${field.label}`
          })
        }

        if (
          field.matrix_config.rows.length === 0 ||
          field.matrix_config.columns.length === 0
        ) {
          return res.status(400).json({
            error: `Matrix field ${field.label} requires rows and columns`
          })
        }

        // ✅ EMPTY MATRIX VALUE VALIDATION
        const emptyRow = field.matrix_config.rows.some(
          row => !row || !row.trim()
        )

        const validTypes = ['checkbox', 'number', 'text', 'radio']

        const emptyColumn = field.matrix_config.columns.some(
          col => {
            if (typeof col === 'string') return !col || !col.trim()
            return !col.label || !col.label.trim() || !validTypes.includes(col.type)
          }
        )

        if (emptyRow || emptyColumn) {
          return res.status(400).json({
            error: `${field.label} matrix rows/columns cannot be empty`
          })
        }
      }
    }
  }

  const client = await pool.connect()

  try {

    await client.query('BEGIN')

    // =========================
    // CREATE FORM
    // =========================

    const formResult = await client.query(
      `
      INSERT INTO form
      (organisation_id, name, description, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        organisation_id,
        name,
        description || null,
        status || 'DRAFT'
      ]
    )

    const form = formResult.rows[0]

    // =========================
    // CREATE SECTIONS
    // =========================

    for (const sectionData of sections) {

      const sectionResult = await client.query(
        `
        INSERT INTO form_section
        (form_id, title, description, display_order)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          form.id,
          sectionData.title,
          sectionData.description || null,
          sectionData.display_order ?? 0
        ]
      )

      const section = sectionResult.rows[0]

      // =========================
      // CREATE FIELDS
      // =========================

      for (const fieldData of sectionData.fields || []) {

        const fieldResult = await client.query(
          `
          INSERT INTO form_field
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
          RETURNING *
          `,
          [
            section.id,
            fieldData.label,
            fieldData.field_key.trim().toLowerCase(),
            fieldData.field_type,
            fieldData.is_required || false,
            fieldData.display_order ?? 0,
            fieldData.field_config || {}
          ]
        )

        const field = fieldResult.rows[0]

        // =========================
        // CREATE OPTIONS
        // =========================

        if (
          fieldData.options &&
          fieldData.options.length > 0
        ) {

          for (const opt of fieldData.options) {

            await client.query(
              `
              INSERT INTO field_option
              (
                field_id,
                value,
                label,
                display_order
              )
              VALUES ($1, $2, $3, $4)
              `,
              [
                field.id,
                opt.value,
                opt.label,
                opt.display_order ?? 0
              ]
            )
          }
        }

        // =========================
        // CREATE MATRIX CONFIG
        // =========================

        if (
          fieldData.field_type === 'matrix' &&
          fieldData.matrix_config &&
          Array.isArray(fieldData.matrix_config.rows) &&
          Array.isArray(fieldData.matrix_config.columns)
        ) {

          await client.query(
            `
            INSERT INTO field_matrix_config
            (field_id, rows, columns)
            VALUES ($1, $2, $3)
            `,
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

    const formWithDetails = await client.query(
      getFormQuery,
      [form.id]
    )

    res.status(201).json(formWithDetails.rows[0])

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

// =========================
// GET ALL FORMS
// =========================

router.get('/', async (req, res) => {

  const { organisation_id } = req.query

  try {

    let query = `
      SELECT f.*,
        (SELECT COUNT(*) FROM form_submission WHERE form_id = f.id)::int as submission_count,
        COALESCE(json_agg(
          jsonb_build_object(
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
                      jsonb_build_object(
                        'id', fo.id,
                        'field_id', fo.field_id,
                        'value', fo.value,
                        'label', fo.label,
                        'display_order', fo.display_order
                      )
                    ) FILTER (WHERE fo.id IS NOT NULL), '[]')
                    FROM field_option fo
                    WHERE fo.field_id = ff.id
                  ),
                  'matrix_config', (
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
              ) FILTER (WHERE ff.id IS NOT NULL), '[]')
              FROM form_field ff
              WHERE ff.section_id = s.id
            )
          )
          ORDER BY s.display_order
        ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections
      FROM form f
      LEFT JOIN form_section s ON s.form_id = f.id
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

    res.status(500).json({
      error: err.message
    })
  }
})

// =========================
// GET SINGLE FORM
// =========================

router.get('/:id', async (req, res) => {

  try {

    const result = await pool.query(
      getFormQuery,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Form not found'
      })
    }

    res.json(result.rows[0])

  } catch (err) {

    res.status(500).json({
      error: err.message
    })
  }
})

router.get('/:id/submissions', async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        s.*,
        f.name AS form_name,
        COALESCE(
          (SELECT COUNT(*) FROM form_answer WHERE submission_id = s.id),
          0
        )::int AS answer_count
      FROM form_submission s
      LEFT JOIN form f
      ON s.form_id = f.id
      WHERE s.form_id = $1
      ORDER BY s.submitted_at DESC
      `,
      [req.params.id]
    )

    res.json(result.rows)

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })
  }
})

// =========================
// UPDATE FORM (sections, fields, options, matrix)
// =========================

router.put('/:id', async (req, res) => {

  const {
    name,
    description,
    status,
    sections
  } = req.body

  try {

    // Check if form has submissions
    const subCheck = await pool.query(
      'SELECT COUNT(*)::int as count FROM form_submission WHERE form_id = $1',
      [req.params.id]
    )

    if (subCheck.rows[0].count > 0) {
      return res.status(403).json({
        error: 'Cannot edit a form that has submissions'
      })
    }

    // =========================
    // VALIDATIONS (same as POST)
    // =========================

    if (!sections || sections.length === 0) {
      return res.status(400).json({
        error: 'Form must contain at least one section'
      })
    }

    const totalFields = sections.reduce(
      (acc, section) => acc + (section.fields?.length || 0),
      0
    )

    if (totalFields === 0) {
      return res.status(400).json({
        error: 'Form must contain at least one field'
      })
    }

    const fieldKeys = []
    const optionFields = ['radio', 'checkbox', 'dropdown', 'multiselect']

    for (const section of sections) {
      for (const field of section.fields || []) {

        if (!field.field_key || field.field_key.trim() === '') {
          return res.status(400).json({
            error: `Field key missing for ${field.label || 'Unnamed Field'}`
          })
        }

        const normalizedKey = field.field_key.trim().toLowerCase()
        const keyRegex = /^[a-z0-9_]+$/

        if (!keyRegex.test(normalizedKey)) {
          return res.status(400).json({
            error: `Invalid field key: ${field.field_key}`
          })
        }

        if (fieldKeys.includes(normalizedKey)) {
          return res.status(400).json({
            error: `Duplicate field key: ${field.field_key}`
          })
        }

        fieldKeys.push(normalizedKey)

        if (!field.label || field.label.trim() === '') {
          return res.status(400).json({
            error: 'Every field must contain a label'
          })
        }

        if (optionFields.includes(field.field_type)) {
          if (!field.options || field.options.length === 0) {
            return res.status(400).json({
              error: `${field.label} requires at least one option`
            })
          }

          for (const option of field.options) {
            if (
              !option.value ||
              option.value.trim() === '' ||
              !option.label ||
              option.label.trim() === ''
            ) {
              return res.status(400).json({
                error: `Invalid option in ${field.label}`
              })
            }
          }
        }

        if (field.field_type === 'matrix') {
          if (
            !field.matrix_config ||
            !Array.isArray(field.matrix_config.rows) ||
            !Array.isArray(field.matrix_config.columns)
          ) {
            return res.status(400).json({
              error: `Invalid matrix configuration in ${field.label}`
            })
          }

          if (
            field.matrix_config.rows.length === 0 ||
            field.matrix_config.columns.length === 0
          ) {
            return res.status(400).json({
              error: `Matrix field ${field.label} requires rows and columns`
            })
          }

          const emptyRow = field.matrix_config.rows.some(
            row => !row || !row.trim()
          )

          const validTypes = ['checkbox', 'number', 'text', 'radio']

          const emptyColumn = field.matrix_config.columns.some(
            col => {
              if (typeof col === 'string') return !col || !col.trim()
              return !col.label || !col.label.trim() || !validTypes.includes(col.type)
            }
          )

          if (emptyRow || emptyColumn) {
            return res.status(400).json({
              error: `${field.label} matrix rows/columns cannot be empty`
            })
          }
        }
      }
    }

    const client = await pool.connect()

    try {

      await client.query('BEGIN')

      // =========================
      // UPDATE FORM METADATA
      // =========================

      const formResult = await client.query(
        `
        UPDATE form
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status)
        WHERE id = $4
        RETURNING *
        `,
        [
          name,
          description || null,
          status || 'DRAFT',
          req.params.id
        ]
      )

      if (formResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Form not found' })
      }

      const formId = req.params.id

      // =========================
      // SYNC SECTIONS
      // =========================

      const incomingSectionIds = sections
        .map(s => s.id)
        .filter(id => id != null)

      if (incomingSectionIds.length > 0) {
        await client.query(
          `DELETE FROM form_section WHERE form_id = $1 AND id NOT IN (${incomingSectionIds.map((_, i) => '$' + (i + 2)).join(',')})`,
          [formId, ...incomingSectionIds]
        )
      } else {
        await client.query(
          'DELETE FROM form_section WHERE form_id = $1',
          [formId]
        )
      }

      for (const sectionData of sections) {

        let sectionId

        if (sectionData.id) {

          // UPDATE existing section
          await client.query(
            `
            UPDATE form_section
            SET title = $1, description = $2, display_order = $3
            WHERE id = $4
            `,
            [
              sectionData.title,
              sectionData.description || null,
              sectionData.display_order ?? 0,
              sectionData.id
            ]
          )
          sectionId = sectionData.id

        } else {

          // INSERT new section
          const result = await client.query(
            `
            INSERT INTO form_section
            (form_id, title, description, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [
              formId,
              sectionData.title,
              sectionData.description || null,
              sectionData.display_order ?? 0
            ]
          )
          sectionId = result.rows[0].id
        }

        // =========================
        // SYNC FIELDS per section
        // =========================

        const fields = sectionData.fields || []
        const incomingFieldIds = fields
          .map(f => f.id)
          .filter(id => id != null)

        if (incomingFieldIds.length > 0) {
          await client.query(
            `DELETE FROM form_field WHERE section_id = $1 AND id NOT IN (${incomingFieldIds.map((_, i) => '$' + (i + 2)).join(',')})`,
            [sectionId, ...incomingFieldIds]
          )
        } else {
          await client.query(
            'DELETE FROM form_field WHERE section_id = $1',
            [sectionId]
          )
        }

        for (const fieldData of fields) {

          let fieldId

          if (fieldData.id) {

            // UPDATE existing field
            await client.query(
              `
              UPDATE form_field
              SET
                label = $1,
                field_key = $2,
                field_type = $3,
                is_required = $4,
                display_order = $5,
                field_config = $6
              WHERE id = $7
              `,
              [
                fieldData.label,
                fieldData.field_key.trim().toLowerCase(),
                fieldData.field_type,
                fieldData.is_required || false,
                fieldData.display_order ?? 0,
                fieldData.field_config || {},
                fieldData.id
              ]
            )
            fieldId = fieldData.id

          } else {

            // INSERT new field
            const result = await client.query(
              `
              INSERT INTO form_field
              (section_id, label, field_key, field_type, is_required, display_order, field_config)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
              `,
              [
                sectionId,
                fieldData.label,
                fieldData.field_key.trim().toLowerCase(),
                fieldData.field_type,
                fieldData.is_required || false,
                fieldData.display_order ?? 0,
                fieldData.field_config || {}
              ]
            )
            fieldId = result.rows[0].id
          }

          // =========================
          // SYNC OPTIONS per field
          // =========================

          const options = fieldData.options || []
          const incomingOptionIds = options
            .map(o => o.id)
            .filter(id => id != null)

          if (incomingOptionIds.length > 0) {
            await client.query(
              `DELETE FROM field_option WHERE field_id = $1 AND id NOT IN (${incomingOptionIds.map((_, i) => '$' + (i + 2)).join(',')})`,
              [fieldId, ...incomingOptionIds]
            )
          } else {
            await client.query(
              'DELETE FROM field_option WHERE field_id = $1',
              [fieldId]
            )
          }

          for (const opt of options) {

            if (opt.id) {

              await client.query(
                `
                UPDATE field_option
                SET value = $1, label = $2, display_order = $3
                WHERE id = $4
                `,
                [
                  opt.value,
                  opt.label,
                  opt.display_order ?? 0,
                  opt.id
                ]
              )

            } else {

              await client.query(
                `
                INSERT INTO field_option
                (field_id, value, label, display_order)
                VALUES ($1, $2, $3, $4)
                `,
                [
                  fieldId,
                  opt.value,
                  opt.label,
                  opt.display_order ?? 0
                ]
              )
            }
          }

          // =========================
          // UPSERT MATRIX CONFIG per field
          // =========================

          if (fieldData.field_type === 'matrix' && fieldData.matrix_config) {

            const existing = await client.query(
              'SELECT id FROM field_matrix_config WHERE field_id = $1',
              [fieldId]
            )

            if (existing.rows.length > 0) {

              await client.query(
                `
                UPDATE field_matrix_config
                SET rows = $1, columns = $2
                WHERE field_id = $3
                `,
                [
                  JSON.stringify(fieldData.matrix_config.rows),
                  JSON.stringify(fieldData.matrix_config.columns),
                  fieldId
                ]
              )

            } else {

              await client.query(
                `
                INSERT INTO field_matrix_config
                (field_id, rows, columns)
                VALUES ($1, $2, $3)
                `,
                [
                  fieldId,
                  JSON.stringify(fieldData.matrix_config.rows),
                  JSON.stringify(fieldData.matrix_config.columns)
                ]
              )
            }

          } else {

            // Remove matrix config if field type changed away from matrix
            await client.query(
              'DELETE FROM field_matrix_config WHERE field_id = $1',
              [fieldId]
            )
          }
        }
      }

      await client.query('COMMIT')

      const formWithDetails = await client.query(
        getFormQuery,
        [formId]
      )

      res.json(formWithDetails.rows[0])

    } catch (err) {

      await client.query('ROLLBACK')

      console.error(err)

      res.status(500).json({
        error: err.message
      })

    } finally {

      client.release()
    }

  } catch (err) {

    res.status(500).json({
      error: err.message
    })
  }
})

// =========================
// DELETE FORM
// =========================

router.delete('/:id', async (req, res) => {

  try {

    const result = await pool.query(
      'DELETE FROM form WHERE id = $1',
      [req.params.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Form not found'
      })
    }

    res.status(204).send()

  } catch (err) {

    res.status(500).json({
      error: err.message
    })
  }
})

module.exports = router