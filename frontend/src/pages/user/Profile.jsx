import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'

const emptyAddressForm = () => ({
  recipientName: '',
  recipientPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pinCode: '',
  isDefault: false,
})

function AddressForm({ form, onChange, onSubmit, onCancel, submitting, submitLabel }) {
  const { t } = useTranslation()
  const update = (field) => (e) =>
    onChange({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <form onSubmit={onSubmit}>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.recipientName')}</label>
          <input className="form-control form-control-sm" value={form.recipientName} onChange={update('recipientName')} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.recipientPhone')}</label>
          <input className="form-control form-control-sm" value={form.recipientPhone} onChange={update('recipientPhone')} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.addressLine1')}</label>
          <input className="form-control form-control-sm" value={form.addressLine1} onChange={update('addressLine1')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.addressLine2')}</label>
          <input className="form-control form-control-sm" value={form.addressLine2} onChange={update('addressLine2')} />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.city')}</label>
          <input className="form-control form-control-sm" value={form.city} onChange={update('city')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.state')}</label>
          <input className="form-control form-control-sm" value={form.state} onChange={update('state')} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small">{t('profile.addresses.pinCode')}</label>
          <input className="form-control form-control-sm" value={form.pinCode} onChange={update('pinCode')} required />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="isDefault"
              checked={form.isDefault}
              onChange={update('isDefault')}
            />
            <label className="form-check-label small" htmlFor="isDefault">
              {t('profile.addresses.setDefault')}
            </label>
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn-ktw-primary btn-sm mt-3" disabled={submitting}>
        {submitting ? t('profile.addresses.saving') : submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="btn btn-outline-secondary btn-sm mt-3 ms-2" onClick={onCancel} disabled={submitting}>
          {t('profile.addresses.cancel')}
        </button>
      )}
    </form>
  )
}

function AddressesSection() {
  const { t } = useTranslation()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddressForm())
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyAddressForm())
  const [submitting, setSubmitting] = useState(false)

  const loadAddresses = () => {
    setLoading(true)
    apiClient
      .get('/users/me/addresses')
      .then((res) => setAddresses(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(loadAddresses, [])

  const toPayload = (form) => ({
    recipientName: form.recipientName || null,
    recipientPhone: form.recipientPhone || null,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2 || null,
    city: form.city,
    state: form.state,
    pinCode: form.pinCode,
    isDefault: !!form.isDefault,
  })

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await apiClient.post('/users/me/addresses', toPayload(addForm))
      setAddForm(emptyAddressForm())
      setShowAddForm(false)
      loadAddresses()
      setMessage({ type: 'success', text: t('profile.addresses.added') })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.addresses.addError') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (address) => {
    setEditingId(address.userAddressId)
    setEditForm({
      recipientName: address.recipientName ?? '',
      recipientPhone: address.recipientPhone ?? '',
      addressLine1: address.addressLine1 ?? '',
      addressLine2: address.addressLine2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      pinCode: address.pinCode ?? '',
      isDefault: !!address.isDefault,
    })
    setMessage(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyAddressForm())
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await apiClient.put(`/users/me/addresses/${editingId}`, toPayload(editForm))
      setEditingId(null)
      setEditForm(emptyAddressForm())
      loadAddresses()
      setMessage({ type: 'success', text: t('profile.addresses.updated') })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.addresses.updateError') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (address) => {
    setMessage(null)
    try {
      await apiClient.delete(`/users/me/addresses/${address.userAddressId}`)
      loadAddresses()
      setMessage({ type: 'success', text: t('profile.addresses.deleted') })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.addresses.deleteError') })
    }
  }

  const handleMakeDefault = async (address) => {
    setMessage(null)
    try {
      await apiClient.put(`/users/me/addresses/${address.userAddressId}`, {
        recipientName: address.recipientName || null,
        recipientPhone: address.recipientPhone || null,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || null,
        city: address.city,
        state: address.state,
        pinCode: address.pinCode,
        isDefault: true,
      })
      loadAddresses()
      setMessage({ type: 'success', text: t('profile.addresses.defaultUpdated') })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.addresses.defaultUpdateError') })
    }
  }

  return (
    <div className="card ktw-card p-3 mb-4">
      <h6 className="mb-3">{t('profile.addresses.title')}</h6>
      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}

      {loading ? (
        <p>{t('profile.addresses.loading')}</p>
      ) : (
        <>
          {addresses.length === 0 && <p className="text-muted">{t('profile.addresses.empty')}</p>}
          {addresses.map((a) =>
            editingId === a.userAddressId ? (
              <div className="border rounded p-2 mb-2" key={a.userAddressId}>
                <AddressForm
                  form={editForm}
                  onChange={setEditForm}
                  onSubmit={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  submitting={submitting}
                  submitLabel={t('profile.addresses.saveEdit')}
                />
              </div>
            ) : (
              <div className="border rounded p-2 mb-2 d-flex justify-content-between align-items-center" key={a.userAddressId}>
                <div>
                  <div>
                    {a.recipientName && <strong>{a.recipientName} &middot; </strong>}
                    {a.addressLine1}
                    {a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state} {a.pinCode}
                  </div>
                  {a.recipientPhone && (
                    <small className="text-muted">{t('profile.addresses.phoneLabel', { phone: a.recipientPhone })}</small>
                  )}
                  {a.isDefault && <span className="price-chip ms-2">{t('profile.addresses.default')}</span>}
                </div>
                <div className="d-flex gap-2">
                  {!a.isDefault && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => handleMakeDefault(a)}>
                      {t('profile.addresses.makeDefault')}
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleStartEdit(a)}>
                    {t('profile.addresses.edit')}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a)}>
                    {t('profile.addresses.delete')}
                  </button>
                </div>
              </div>
            )
          )}

          {showAddForm ? (
            <div className="border rounded p-2 mt-2">
              <AddressForm
                form={addForm}
                onChange={setAddForm}
                onSubmit={handleAdd}
                onCancel={() => {
                  setShowAddForm(false)
                  setAddForm(emptyAddressForm())
                }}
                submitting={submitting}
                submitLabel={t('profile.addresses.save')}
              />
            </div>
          ) : (
            <button className="btn btn-sm btn-ktw-primary mt-2" onClick={() => setShowAddForm(true)}>
              {t('profile.addresses.addAddress')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ChangePasswordSection() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await apiClient.post('/auth/change-password', form)
      setMessage({ type: 'success', text: t('profile.changePassword.success') })
      setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.changePassword.error') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card ktw-card p-3">
      <h6 className="mb-3">{t('profile.changePassword.title')}</h6>
      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label small">{t('profile.changePassword.currentPassword')}</label>
            <input
              type="password"
              className="form-control form-control-sm"
              value={form.currentPassword}
              onChange={update('currentPassword')}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">{t('profile.changePassword.newPassword')}</label>
            <input
              type="password"
              className="form-control form-control-sm"
              value={form.newPassword}
              onChange={update('newPassword')}
              required
              minLength={6}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">{t('profile.changePassword.confirmNewPassword')}</label>
            <input
              type="password"
              className="form-control form-control-sm"
              value={form.confirmNewPassword}
              onChange={update('confirmNewPassword')}
              required
              minLength={6}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-ktw-primary btn-sm mt-3" disabled={submitting}>
          {submitting ? t('profile.changePassword.saving') : t('profile.changePassword.save')}
        </button>
      </form>
    </div>
  )
}

function MyDetailsSection() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then((res) => setForm({ firstName: res.data.firstName || '', lastName: res.data.lastName || '' }))
      .finally(() => setLoading(false))
  }, [])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await apiClient.put('/auth/me', form)
      setMessage({ type: 'success', text: t('profile.myDetails.updated') })
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || t('profile.myDetails.updateError') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card ktw-card p-3 mb-4">
      <h6 className="mb-3">{t('profile.myDetails.title')}</h6>
      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}
      {loading ? (
        <p>{t('profile.myDetails.loading')}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label small">{t('profile.myDetails.firstName')}</label>
              <input className="form-control form-control-sm" value={form.firstName} onChange={update('firstName')} required />
            </div>
            <div className="col-md-4">
              <label className="form-label small">{t('profile.myDetails.lastName')}</label>
              <input className="form-control form-control-sm" value={form.lastName} onChange={update('lastName')} required />
            </div>
          </div>
          <button type="submit" className="btn btn-ktw-primary btn-sm mt-3" disabled={submitting}>
            {submitting ? t('profile.myDetails.saving') : t('profile.myDetails.save')}
          </button>
        </form>
      )}
    </div>
  )
}

export default function Profile() {
  const { t } = useTranslation()

  return (
    <div>
      <h4 className="mb-4">{t('profile.title')}</h4>
      <MyDetailsSection />
      <AddressesSection />
      <ChangePasswordSection />
    </div>
  )
}
