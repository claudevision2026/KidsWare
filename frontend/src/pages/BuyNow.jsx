import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatAgeGroup } from '../utils/format'

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

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

export default function BuyNow() {
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, phoneNumber } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(() => searchParams.get('age') || '')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    apiClient.get(`/products/${productId}`).then((res) => setProduct(res.data))
  }, [productId, isAuthenticated, navigate])

  if (!product) return <div className="container py-5">{t('buyNow.loading')}</div>

  const selectedPrice = product.prices.find((p) => p.ageGroup === selectedAgeGroup)

  const handlePay = async () => {
    setError('')
    if (!selectedAgeGroup) {
      setError(t('buyNow.selectAgeGroupError'))
      return
    }
    if (!RAZORPAY_KEY_ID) {
      setError(t('buyNow.gatewayNotConfigured'))
      return
    }
    setProcessing(true)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error(t('buyNow.checkoutLoadError'))

      const { data: orderData } = await apiClient.post('/payments/create-order', {
        productId: Number(productId),
        ageGroup: selectedAgeGroup,
      })

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpayOrderId,
        name: 'Kids Trendy Ware',
        description: product.productName,
        prefill: { contact: phoneNumber },
        handler: async (response) => {
          await apiClient.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            productId: Number(productId),
            ageGroup: selectedAgeGroup,
            price: selectedPrice.price,
          })
          navigate('/my-orders')
        },
        theme: { color: '#a259c6' },
      }
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('buyNow.paymentError'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <div className="card ktw-card p-4">
        <h4 className="mb-3">{t('buyNow.title', { name: product.productName })}</h4>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <p className="fw-semibold mb-2">{t('buyNow.selectAgeGroup')}</p>
        {product.prices.map((p) => (
          <div className="form-check mb-2" key={p.productPriceId}>
            <input
              className="form-check-input"
              type="radio"
              name="ageGroup"
              id={`age-${p.productPriceId}`}
              value={p.ageGroup}
              checked={selectedAgeGroup === p.ageGroup}
              onChange={() => setSelectedAgeGroup(p.ageGroup)}
            />
            <label className="form-check-label" htmlFor={`age-${p.productPriceId}`}>
              {formatAgeGroup(p.ageGroup, t('common.years'))} &mdash; ₹{p.price}
            </label>
          </div>
        ))}

        <button className="btn btn-ktw-primary mt-3" onClick={handlePay} disabled={processing}>
          {processing ? t('buyNow.processing') : t('buyNow.proceedToPay')}
        </button>
      </div>
    </div>
  )
}
