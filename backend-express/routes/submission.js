const express = require('express')
const pool = require('../db')
const router = express.Router()

/**
 * CREATE SUBMISSION
 */
router.post('/', async (req, res) => {
  const { form_id, student_id, answers } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const submissionResult = await client.query(
      'INSERT INTO form_submission (form_id, student_id) VALUES ($1, $2) RETURNING *',
      [form_id, student_id]
    )
    const submission = submissionResult.rows[0]

    if (answers && answers.length > 0) {
      for (const answer of answers) {
        await client.query(
          `INSERT INTO form_answer 
          (submission_id, field_id, answer_text, answer_number, answer_json) 
          VALUES ($1, $2, $3, $4, $5)`,
          [
            submission.id,
            answer.field_id,
            answer.answer_text || null,
            answer.answer_number || null,
            answer.answer_json || null
          ]
        )
      }
    }

    await client.query('COMMIT')

    const result = await client.query(`
      SELECT fs.*, 
        COALESCE(json_agg(
          jsonb_build_object(
            'id', fa.id,
            'submission_id', fa.submission_id,
            'field_id', fa.field_id,
            'answer_text', fa.answer_text,
            'answer_number', fa.answer_number,
            'answer_json', fa.answer_json
          )
        ) FILTER (WHERE fa.id IS NOT NULL), '[]') as answers
      FROM form_submission fs
      LEFT JOIN form_answer fa ON fa.submission_id = fs.id
      WHERE fs.id = $1
      GROUP BY fs.id
    `, [submission.id])

    res.status(201).json(result.rows[0])

  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

/**
 * GET ALL SUBMISSIONS (FILTERABLE)
 */
router.get('/', async (req, res) => {
  const { form_id, student_id } = req.query

  try {
    let query = `
      SELECT fs.*, 
        COALESCE(json_agg(
          jsonb_build_object(
            'id', fa.id,
            'submission_id', fa.submission_id,
            'field_id', fa.field_id,
            'answer_text', fa.answer_text,
            'answer_number', fa.answer_number,
            'answer_json', fa.answer_json
          )
        ) FILTER (WHERE fa.id IS NOT NULL), '[]') as answers
      FROM form_submission fs
      LEFT JOIN form_answer fa ON fa.submission_id = fs.id
    `

    const params = []
    const conditions = []

    if (form_id) {
      params.push(form_id)
      conditions.push(`fs.form_id = $${params.length}`)
    }

    if (student_id) {
      params.push(student_id)
      conditions.push(`fs.student_id = $${params.length}`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' GROUP BY fs.id ORDER BY fs.id DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * 🔥 GET SINGLE SUBMISSION (UPDATED WITH SECTIONS)
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params

  try {
    // 🔹 Get submission info
    const submissionResult = await pool.query(
      `SELECT fs.*, f.name as form_name, s.student_identifier
       FROM form_submission fs
       JOIN form f ON fs.form_id = f.id
       JOIN student s ON fs.student_id = s.id
       WHERE fs.id = $1`,
      [id]
    )

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    // 🔥 Join sections + fields + answers
    const answersResult = await pool.query(
      `SELECT 
          fs.id as section_id,
          fs.title as section_title,
          fs.display_order as section_order,

          ff.id as field_id,
          ff.label,
          ff.display_order as field_order,

          fa.answer_text,
          fa.answer_number,
          fa.answer_json

       FROM form_answer fa
       JOIN form_field ff ON fa.field_id = ff.id
       JOIN form_section fs ON ff.section_id = fs.id

       WHERE fa.submission_id = $1

       ORDER BY fs.display_order, ff.display_order`,
      [id]
    )

    // 🔥 Group answers by section
    const sectionMap = {}

    for (const row of answersResult.rows) {
      if (!sectionMap[row.section_id]) {
        sectionMap[row.section_id] = {
          title: row.section_title,
          order: row.section_order,
          answers: []
        }
      }

      const value =
        row.answer_text ??
        row.answer_number ??
        row.answer_json

      sectionMap[row.section_id].answers.push({
        label: row.label,
        value
      })
    }

    const sections = Object.values(sectionMap).sort(
      (a, b) => a.order - b.order
    )

    res.json({
      submission: submissionResult.rows[0],
      sections
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE SUBMISSION
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM form_submission WHERE id = $1',
      [req.params.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    res.status(204).send()

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router