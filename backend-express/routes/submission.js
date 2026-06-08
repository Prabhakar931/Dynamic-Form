const express = require( 'express' )
const pool = require( '../db' )
const auth = require( '../middleware/auth' )
const router = express.Router()

/**
 * CREATE SUBMISSION
 */
router.post( '/', async ( req, res ) => {
  const { form_id, answers } = req.body
  const client = await pool.connect()

  try {
    await client.query( 'BEGIN' )

    const uniqueFormFieldsRes = await client.query( `SELECT ff.id,field_key,ff.label FROM form_field ff JOIN form_section fs on fs.id=ff.section_id WHERE fs.form_id = $1 AND ff.is_unique`, [form_id] )
    const uniqueFormFields = uniqueFormFieldsRes.rows

    let alreadyExists = null

    for ( const field of uniqueFormFields ) {
      const answer = answers.find( ans => ans.field_id === field.id )?.answer_text
      const exists = await client.query( `SELECT field_id FROM form_answer fa JOIN form_submission fs ON fs.id=fa.submission_id WHERE fs.form_id=$1 AND fa.field_id=$2 AND fa.answer_text=$3`, [form_id, field.id, answer] )
      if ( exists.rowCount > 0 ) {
        alreadyExists = { ...field, answer }
        break
      }
    }

    if ( alreadyExists )
      return res.status( 400 ).json( { error: `Submission already exists for ${alreadyExists.answer}!` } )

    // ✅ CREATE SUBMISSION
    const submissionResult = await client.query(
      `
      INSERT INTO form_submission
      (form_id)
      VALUES ($1)
      RETURNING *
      `,
      [form_id]
    )

    const submission = submissionResult.rows[0]
    console.log( 'Created submission with ID:', answers )
    // ✅ INSERT ANSWERS
    if ( answers && answers.length > 0 ) {
      for ( const answer of answers ) {
        await client.query(
          `
          INSERT INTO form_answer
          (
            submission_id,
            field_id,
            answer_text,
            answer_number,
            answer_json
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            submission.id,
            answer.field_id,
            answer.answer_text || null,
            answer.answer_number || null,

            // ✅ FIX JSON ISSUE
            answer.answer_json
              ? JSON.stringify( answer.answer_json )
              : null
          ]
        )
      }
    }

    await client.query( 'COMMIT' )

    // ✅ RETURN CREATED SUBMISSION
    const result = await client.query(
      `
      SELECT
        fs.*,

        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', fa.id,
              'submission_id', fa.submission_id,
              'field_id', fa.field_id,
              'answer_text', fa.answer_text,
              'answer_number', fa.answer_number,
              'answer_json', fa.answer_json
            )
          ) FILTER (WHERE fa.id IS NOT NULL),
          '[]'
        ) as answers

      FROM form_submission fs

      LEFT JOIN form_answer fa
      ON fa.submission_id = fs.id

      WHERE fs.id = $1

      GROUP BY fs.id
      `,
      [submission.id]
    )

    res.status( 201 ).json( result.rows[0] )

  } catch ( err ) {
    await client.query( 'ROLLBACK' )

    console.error( err )

    res.status( 500 ).json( {
      error: err.message
    } )

  } finally {
    client.release()
  }
} )

/**
 * GET ALL SUBMISSIONS
 */
router.get( '/', auth, async ( req, res ) => {
  const { form_id } = req.query

  try {
    let query = `
      SELECT
        fs.*,

        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', fa.id,
              'submission_id', fa.submission_id,
              'field_id', fa.field_id,
              'answer_text', fa.answer_text,
              'answer_number', fa.answer_number,
              'answer_json', fa.answer_json
            )
          ) FILTER (WHERE fa.id IS NOT NULL),
          '[]'
        ) as answers

      FROM form_submission fs

      LEFT JOIN form_answer fa
      ON fa.submission_id = fs.id
    `

    const params = []
    const conditions = []

    if ( form_id ) {
      params.push( form_id )
      conditions.push( `fs.form_id = $${params.length}` )
    }

    if ( conditions.length > 0 ) {
      query += ` WHERE ${conditions.join( ' AND ' )}`
    }

    query += `
      GROUP BY fs.id
      ORDER BY fs.id DESC
    `

    const result = await pool.query( query, params )

    res.json( result.rows )

  } catch ( err ) {
    console.error( err )

    res.status( 500 ).json( {
      error: err.message
    } )
  }
} )

/**
 * GET SINGLE SUBMISSION
 */
router.get( '/:id', auth, async ( req, res ) => {
  const { id } = req.params

  try {

    // ✅ SUBMISSION INFO
    const submissionResult = await pool.query(
      `
      SELECT
        fs.*,
        f.name as form_name

      FROM form_submission fs

      JOIN form f
      ON fs.form_id = f.id

      WHERE fs.id = $1
      `,
      [id]
    )

    if ( submissionResult.rows.length === 0 ) {
      return res.status( 404 ).json( {
        error: 'Submission not found'
      } )
    }

    // ✅ GET ANSWERS + OPTIONS
    const answersResult = await pool.query(
      `
      SELECT
        fs.id as section_id,
        fs.title as section_title,
        fs.display_order as section_order,

        ff.id as field_id,
        ff.label,
        ff.field_type,
        ff.display_order as field_order,

        fa.answer_text,
        fa.answer_number,
        fa.answer_json,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'value', fo.value,
                'label', fo.label
              )
            ),
            '[]'
          )
          FROM field_option fo
          WHERE fo.field_id = ff.id
        ) as options,

        (
          SELECT jsonb_build_object(
            'rows', fmc.rows,
            'columns', fmc.columns
          )
          FROM field_matrix_config fmc
          WHERE fmc.field_id = ff.id
        ) as matrix_config

      FROM form_answer fa

      JOIN form_field ff
      ON fa.field_id = ff.id

      JOIN form_section fs
      ON ff.section_id = fs.id

      WHERE fa.submission_id = $1

      ORDER BY
        fs.display_order,
        ff.display_order
      `,
      [id]
    )

    // ✅ GROUP BY SECTION
    const sectionMap = {}
    for ( const row of answersResult.rows ) {

      if ( !sectionMap[row.section_id] ) {
        sectionMap[row.section_id] = {
          title: row.section_title,
          order: row.section_order,
          answers: []
        }
      }

      let value =
        row.answer_text ??
        row.answer_number ??
        row.answer_json

      // ✅ HANDLE RADIO / DROPDOWN
      if (
        ['radio', 'dropdown'].includes( row.field_type )
      ) {
        const matchedOption = row.options.find(
          ( opt ) => opt.value === value
        )

        if ( matchedOption ) {
          value = matchedOption.label
        }
      }

      // ✅ HANDLE CHECKBOX / MULTISELECT
      if (
        ['checkbox', 'multiselect'].includes( row.field_type )
      ) {
        let parsedValues = []

        try {
          parsedValues = Array.isArray( row.answer_json )
            ? row.answer_json
            : JSON.parse( row.answer_json || '[]' )
        } catch {
          parsedValues = []
        }

        value = parsedValues.map( ( selectedValue ) => {
          const matchedOption = row.options.find(
            ( opt ) => opt.value === selectedValue
          )

          return matchedOption
            ? matchedOption.label
            : selectedValue
        } )
      }

      // ✅ HANDLE REPEATABLE GROUP

      if ( row.field_type === 'repeatable_group' ) {

        try {

          value = Array.isArray( row.answer_json )
            ? row.answer_json
            : JSON.parse( row.answer_json || '[]' )

        } catch {

          value = []
        }
      }


      sectionMap[row.section_id].answers.push( {
        label: row.label,
        field_type: row.field_type,
        value,
        matrix_config: row.matrix_config
      } )
    }

    const sections = Object.values( sectionMap ).sort(
      ( a, b ) => a.order - b.order
    )

    res.json( {
      submission: submissionResult.rows[0],
      sections
    } )

  } catch ( err ) {
    console.error( err )

    res.status( 500 ).json( {
      error: err.message
    } )
  }
} )

/**
 * DELETE SUBMISSION
 */
router.delete( '/:id', auth, async ( req, res ) => {
  try {

    const result = await pool.query(
      `
      DELETE FROM form_submission
      WHERE id = $1
      `,
      [req.params.id]
    )

    if ( result.rowCount === 0 ) {
      return res.status( 404 ).json( {
        error: 'Submission not found'
      } )
    }

    res.status( 204 ).send()

  } catch ( err ) {
    console.error( err )

    res.status( 500 ).json( {
      error: err.message
    } )
  }
} )

module.exports = router