import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    email: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError(t('register.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail || t('register.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card ktw-card p-4">
        <h3 className="text-center mb-4">{t('register.title')}</h3>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">{t('register.phoneNumber')}</label>
            <input
              type="tel"
              className="form-control"
              value={form.phoneNumber}
              onChange={update('phoneNumber')}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('register.email')}</label>
            <input type="email" className="form-control" value={form.email} onChange={update('email')} required />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('register.password')}</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('register.confirmPassword')}</label>
            <input
              type="password"
              className="form-control"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-ktw-primary w-100" disabled={submitting}>
            {submitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="text-center mt-3 mb-0">
          {t('register.haveAccount')} <Link to="/login">{t('register.login')}</Link>
        </p>
      </div>
    </div>
  )
}
