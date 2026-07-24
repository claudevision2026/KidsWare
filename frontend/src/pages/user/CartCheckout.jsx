import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatAgeGroup, formatLocalPhoneNumber } from '../../utils/format'

const ENABLE_BUY_NOW = import.meta.env.VITE_ENABLE_BUY_NOW === 'true'
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ''
const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'KidsTrendyware'
const DISPLAY_NUMBER = formatLocalPhoneNumber(WHATSAPP_NUMBER)

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

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

export default function CartCheckout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { phoneNumber } = useAuth()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loadingCart, setLoadingCart] = useState(true)

  // Shipping capture
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [newAddressForm, setNewAddressForm] = useState(emptyAddressForm())
  const [shippingMessage, setShippingMessage] = useState(null)
  const [shippingSubmitting, setShippingSubmitting] = useState(false)

  // Payment
  const [paymentError, setPaymentError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    apiClient
      .get('/cart')
      .then((res) => {
        setItems(res.data.items)
        setTotal(res.data.total)
      })
      .finally(() => setLoadingCart(false))
  }, [])

  useEffect(() => {
    if (!loadingCart && items.length === 0) {
      navigate('/cart')
    }
  }, [loadingCart, items, navigate])

  useEffect(() => {
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
  }, [])

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
      const res = await apiClient.post('/users/me/addresses', toAddressPayload(newAddressForm))
      setAddresses((prev) => [...prev, res.data])
      setSelectedAddressId(String(res.data.userAddressId))
      setShowNewAddressForm(false)
      setNewAddressForm(emptyAddressForm())
      setShippingMessage({ type: 'success', text: t('checkout.shipping.saved') })
    } catch (err) {
      setShippingMessage({ type: 'danger', text: err.response?.data?.detail || t('checkout.shipping.saveError') })
    } finally {
      setShippingSubmitting(false)
    }
  }

  const handlePay = async () => {
    setPaymentError('')
    if (!RAZORPAY_KEY_ID) {
      setPaymentError(t('buyNow.gatewayNotConfigured'))
      return
    }
    setProcessing(true)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error(t('buyNow.checkoutLoadError'))

      const { data: orderData } = await apiClient.post('/cart/checkout/create-order')

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpayOrderId,
        name: 'Kids Trendy Ware',
        description: `${items.length} item(s)`,
        prefill: { contact: phoneNumber },
        handler: async (response) => {
          await apiClient.post('/cart/checkout/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userAddressId: Number(selectedAddressId),
          })
          navigate('/my-orders')
        },
        theme: { color: '#a259c6' },
      }
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      setPaymentError(err.response?.data?.detail || err.message || t('buyNow.paymentError'))
    } finally {
      setProcessing(false)
    }
  }

  const selectedAddress = addresses.find((a) => String(a.userAddressId) === selectedAddressId)
  const shippingAddressText = selectedAddress
    ? [selectedAddress.addressLine1, selectedAddress.addressLine2, selectedAddress.city, selectedAddress.state, selectedAddress.pinCode]
        .filter(Boolean)
        .join(', ')
    : ''

  const waMessage = [
    'Hi! I want to buy:',
    ...items.map(
      (item) =>
        `- ${item.productName} (${formatAgeGroup(item.ageGroup, t('common.years'))}) x${item.quantity} - ₹${item.lineTotal}`,
    ),
    `Total: ₹${total}`,
    phoneNumber ? `My phone: ${phoneNumber}` : '',
    shippingAddressText ? `Shipping to: ${shippingAddressText}` : '',
    "I've paid via PhonePe/Google Pay, sharing the screenshot now.",
  ]
    .filter(Boolean)
    .join('\n')
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`

  if (loadingCart) return <p>{t('cart.loading')}</p>

  if (items.length === 0) return null

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card ktw-card p-4">
        <h4 className="mb-3">{t('cartCheckout.title')}</h4>

        <div className="mb-4">
          {items.map((item) => (
            <div key={item.cartItemId} className="d-flex align-items-center gap-3 border-bottom py-2">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="rounded flex-shrink-0"
                  style={{ width: 56, height: 56, objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="ktw-card-img d-flex align-items-center justify-content-center text-muted rounded flex-shrink-0"
                  style={{ width: 56, height: 56 }}
                >
                  {t('productDetails.noImage')}
                </div>
              )}
              <div className="flex-grow-1">
                <p className="mb-0 fw-semibold">{item.productName}</p>
                <p className="mb-0 small text-muted">
                  {formatAgeGroup(item.ageGroup, t('common.years'))} &middot; {t('cart.quantity')}: {item.quantity}
                </p>
              </div>
              <div className="fw-semibold">₹{item.lineTotal}</div>
            </div>
          ))}
          <div className="text-end fw-bold fs-5 mt-2">
            {t('cart.total')}: ₹{total}
          </div>
        </div>

        <h6 className="mb-2">{t('checkout.shipping.title')}</h6>
        {shippingMessage && <div className={`alert alert-${shippingMessage.type} py-2`}>{shippingMessage.text}</div>}

        {loadingAddresses && <p>{t('profile.addresses.loading')}</p>}

        {!loadingAddresses && addresses.length > 0 && !showNewAddressForm && (
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

        {(showNewAddressForm || (addresses.length === 0 && !loadingAddresses)) && (
          <form onSubmit={handleSaveAddress} className="border rounded p-2 mb-4">
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
            {addresses.length > 0 && (
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

        {selectedAddressId && (
          <>
            <h6 className="mb-2">{t('checkout.payment.title')}</h6>
            {paymentError && <div className="alert alert-danger py-2">{paymentError}</div>}

            {ENABLE_BUY_NOW ? (
              <button className="btn btn-ktw-primary" onClick={handlePay} disabled={processing}>
                {processing ? t('buyNow.processing') : t('buyNow.proceedToPay')}
              </button>
            ) : (
              <>
                <div className="mb-4">
                  <h6 className="small fw-semibold">{t('checkout.payment.option1Title')}</h6>
                  <p className="mb-2 small">
                    {t('checkout.payment.option1Body', {
                      amount: total,
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
                    {t('checkout.payment.payWithRazorpay', { amount: total })}
                    <span className="badge bg-warning text-dark ms-1">{t('checkout.payment.comingSoon')}</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
