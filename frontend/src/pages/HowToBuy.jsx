import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import DressPickerModal from '../components/DressPickerModal'
import { formatAgeGroup, formatLocalPhoneNumber } from '../utils/format'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ''
const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'KidsTrendyware'
const DISPLAY_NUMBER = formatLocalPhoneNumber(WHATSAPP_NUMBER)

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

export default function HowToBuy() {
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, phoneNumber: authPhone } = useAuth()

  const selectedAge = searchParams.get('age') || ''
  const selectedImage = searchParams.get('image') || ''

  const [product, setProduct] = useState(null)

  // Shipping capture
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [newAddressForm, setNewAddressForm] = useState(emptyAddressForm())
  const [guestPhone, setGuestPhone] = useState('')
  const [shippingMessage, setShippingMessage] = useState(null)
  const [shippingSubmitting, setShippingSubmitting] = useState(false)
  const [newAccountAlert, setNewAccountAlert] = useState(null) // { phone, tempPassword }
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!productId) return
    apiClient
      .get(`/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch(() => {})
  }, [productId])

  useEffect(() => {
    if (!isAuthenticated) return
    setLoadingAddresses(true)
    apiClient
      .get('/users/me/addresses')
      .then((res) => {
        setAddresses(res.data)
        const preferred = res.data.find((a) => a.isDefault) || res.data[0]
        if (preferred) {
          setSelectedAddressId(String(preferred.userAddressId))
        } else {
          setShowNewAddressForm(true)
        }
      })
      .finally(() => setLoadingAddresses(false))
  }, [isAuthenticated])

  const selectedPrice = product?.prices.find((p) => p.ageGroup === selectedAge)?.price

  const handleDressSelect = (newProductId, ageGroup, imageUrl) => {
    const query = new URLSearchParams({ age: ageGroup, image: imageUrl || '' }).toString()
    navigate(`/how-to-buy/${newProductId}?${query}`)
  }

  const updateNewAddress = (field) => (e) =>
    setNewAddressForm({
      ...newAddressForm,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })

  const toAddressPayload = (form) => ({
    recipientName: form.recipientName || null,
    recipientPhone: form.recipientPhone || null,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2 || null,
    city: form.city,
    state: form.state,
    pinCode: form.pinCode,
    isDefault: !!form.isDefault,
  })

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    setShippingSubmitting(true)
    setShippingMessage(null)
    try {
      if (isAuthenticated) {
        const res = await apiClient.post('/users/me/addresses', toAddressPayload(newAddressForm))
        setAddresses((prev) => [...prev, res.data])
        setSelectedAddressId(String(res.data.userAddressId))
        setShowNewAddressForm(false)
        setNewAddressForm(emptyAddressForm())
      } else {
        const res = await apiClient.post('/checkout/capture-shipping', {
          phoneNumber: guestPhone.trim(),
          newAddress: toAddressPayload(newAddressForm),
        })
        if (res.data.newUserCreated) {
          setNewAccountAlert({ phone: guestPhone.trim(), tempPassword: res.data.tempPassword })
        }
      }
      setShippingMessage({ type: 'success', text: t('checkout.shipping.saved') })
    } catch (err) {
      setShippingMessage({ type: 'danger', text: err.response?.data?.detail || t('checkout.shipping.saveError') })
    } finally {
      setShippingSubmitting(false)
    }
  }

  const handleCopyTempPassword = () => {
    if (!newAccountAlert) return
    navigator.clipboard.writeText(newAccountAlert.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedExistingAddress = addresses.find((a) => String(a.userAddressId) === selectedAddressId)
  const shippingAddressText = selectedExistingAddress
    ? [selectedExistingAddress.addressLine1, selectedExistingAddress.addressLine2, selectedExistingAddress.city, selectedExistingAddress.state, selectedExistingAddress.pinCode]
        .filter(Boolean)
        .join(', ')
    : newAddressForm.addressLine1
      ? [newAddressForm.addressLine1, newAddressForm.addressLine2, newAddressForm.city, newAddressForm.state, newAddressForm.pinCode]
          .filter(Boolean)
          .join(', ')
      : ''

  const phoneForMessage = isAuthenticated ? authPhone : guestPhone

  const waMessage = [
    `Hi! I want to buy: ${product?.productName || ''}`,
    selectedAge ? `Age: ${formatAgeGroup(selectedAge, t('common.years'))}` : '',
    selectedPrice != null ? `Price: ₹${selectedPrice}` : '',
    phoneForMessage ? `My phone: ${phoneForMessage}` : '',
    shippingAddressText ? `Shipping to: ${shippingAddressText}` : '',
    "I've paid via PhonePe/Google Pay, sharing the screenshot now.",
  ]
    .filter(Boolean)
    .join('\n')
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <div className="card ktw-card p-4">
        <h4 className="mb-3">{t('howToBuy.title')}</h4>

        <div className="d-flex gap-3 align-items-start mb-4">
          {selectedImage && (
            <img
              src={selectedImage}
              alt=""
              className="rounded flex-shrink-0"
              style={{ width: 100, height: 100, objectFit: 'cover' }}
            />
          )}
          <div>
            <p className="fw-semibold mb-1">{product?.productName}</p>
            {selectedAge && (
              <p className="mb-1 small">
                {t('checkout.age')}: {formatAgeGroup(selectedAge, t('common.years'))}
              </p>
            )}
            {selectedPrice != null && <p className="mb-1 fw-semibold">{t('checkout.price')}: ₹{selectedPrice}</p>}
            <a href="#dress-picker" data-bs-toggle="modal" data-bs-target="#dress-picker" className="small">
              {t('checkout.changeDress')}
            </a>
          </div>
        </div>

        <div className="alert alert-light border mb-4">
          <strong>{BUSINESS_NAME}</strong>
          <br />
          {t('howToBuy.paymentNumber')} <strong>{DISPLAY_NUMBER}</strong>
          <br />
          <span className="text-muted">{t('howToBuy.verifyNotice')}</span>
        </div>

        <h6 className="mb-2">{t('checkout.shipping.title')}</h6>
        {shippingMessage && <div className={`alert alert-${shippingMessage.type} py-2`}>{shippingMessage.text}</div>}

        {newAccountAlert && (
          <div className="alert alert-warning d-flex justify-content-between align-items-center">
            <div>
              {t('checkout.shipping.accountCreatedNotice', { phone: newAccountAlert.phone })}
              <br />
              {t('checkout.shipping.tempPasswordLabel')} <strong>{newAccountAlert.tempPassword}</strong>
            </div>
            <button type="button" className="btn btn-sm btn-outline-dark ms-2" onClick={handleCopyTempPassword}>
              {copied ? t('checkout.shipping.copied') : t('checkout.shipping.copy')}
            </button>
          </div>
        )}

        {isAuthenticated && loadingAddresses && <p>{t('profile.addresses.loading')}</p>}

        {isAuthenticated && !loadingAddresses && addresses.length > 0 && !showNewAddressForm && (
          <div className="mb-3">
            <p className="fw-semibold small mb-2">{t('checkout.shipping.savedAddresses')}</p>
            {addresses.map((a) => (
              <label
                key={a.userAddressId}
                className="d-flex align-items-start gap-2 border rounded p-2 mb-2"
                style={{
                  cursor: 'pointer',
                  borderColor: String(a.userAddressId) === selectedAddressId ? 'var(--ktw-purple)' : undefined,
                  borderWidth: String(a.userAddressId) === selectedAddressId ? 2 : 1,
                }}
              >
                <input
                  type="radio"
                  name="shipAddress"
                  className="form-check-input mt-1"
                  checked={String(a.userAddressId) === selectedAddressId}
                  onChange={() => setSelectedAddressId(String(a.userAddressId))}
                />
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
              </label>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowNewAddressForm(true)}>
              {t('checkout.shipping.useDifferentAddress')}
            </button>
          </div>
        )}

        {(!isAuthenticated || showNewAddressForm || (addresses.length === 0 && !loadingAddresses)) && (
          <form onSubmit={handleSaveAddress} className="border rounded p-2 mb-4">
            {!isAuthenticated && (
              <div className="mb-2">
                <label className="form-label small">{t('checkout.shipping.phoneNumber')}</label>
                <input
                  className="form-control form-control-sm"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small">{t('profile.addresses.recipientName')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.recipientName}
                  onChange={updateNewAddress('recipientName')}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">{t('profile.addresses.recipientPhone')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.recipientPhone}
                  onChange={updateNewAddress('recipientPhone')}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">{t('profile.addresses.addressLine1')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.addressLine1}
                  onChange={updateNewAddress('addressLine1')}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">{t('profile.addresses.addressLine2')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.addressLine2}
                  onChange={updateNewAddress('addressLine2')}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">{t('profile.addresses.city')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.city}
                  onChange={updateNewAddress('city')}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">{t('profile.addresses.state')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.state}
                  onChange={updateNewAddress('state')}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">{t('profile.addresses.pinCode')}</label>
                <input
                  className="form-control form-control-sm"
                  value={newAddressForm.pinCode}
                  onChange={updateNewAddress('pinCode')}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-sm btn-ktw-primary mt-3" disabled={shippingSubmitting}>
              {shippingSubmitting ? t('checkout.shipping.saving') : t('checkout.shipping.save')}
            </button>
            {isAuthenticated && addresses.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-3 ms-2"
                onClick={() => setShowNewAddressForm(false)}
              >
                {t('profile.addresses.cancel')}
              </button>
            )}
          </form>
        )}

        <h6 className="mb-2">{t('checkout.payment.title')}</h6>

        <div className="mb-4">
          <h6 className="small fw-semibold">{t('checkout.payment.option1Title')}</h6>
          <p className="mb-2 small">
            {t('checkout.payment.option1Body', {
              amount: selectedPrice ?? '',
              number: DISPLAY_NUMBER,
              name: BUSINESS_NAME,
            })}
          </p>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
            <i className="bi bi-whatsapp me-1" /> {t('checkout.payment.whatsappButton')}
          </a>
        </div>

        <div>
          <h6 className="small fw-semibold">{t('checkout.payment.option2Title')}</h6>
          <p className="mb-2 small">{t('checkout.payment.option2Body')}</p>
          <button
            type="button"
            className="btn d-flex align-items-center gap-2"
            disabled
            style={{ background: '#072654', color: '#fff', opacity: 0.85 }}
          >
            <i className="bi bi-lock-fill" />
            {t('checkout.payment.payWithRazorpay', { amount: selectedPrice ?? '' })}
            <span className="badge bg-warning text-dark ms-1">{t('checkout.payment.comingSoon')}</span>
          </button>
        </div>
      </div>

      <DressPickerModal modalId="dress-picker" productId={productId} onSelect={handleDressSelect} />
    </div>
  )
}
