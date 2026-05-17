import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function FormSubmissions() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/forms', { replace: true })
  }, [])

  return null
}
