import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import WhatsAppButton from '../components/WhatsAppButton'
import TryOnModal from '../components/TryOnModal'
import { formatAgeGroup } from '../utils/format'

const ENABLE_BUY_NOW = import.meta.env.VITE_ENABLE_BUY_NOW === 'true'

export default function ProductDetails() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [imageConfirmed, setImageConfirmed] = useState(false)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [validationError, setValidationError] = useState('')
  const [translatedDescription, setTranslatedDescription] = useState(null)
  const [isMachineTranslated, setIsMachineTranslated] = useState(false)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    apiClient
      .get(`/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError(t('productDetails.notFound')))
  }, [productId])

  useEffect(() => {
    setActiveImageIdx(0)
    setImageConfirmed(false)
    setSelectedAgeGroup('')
    setValidationError('')
  }, [productId])

  useEffect(() => {
    if (!product) return
    if (i18n.language === 'en') {
      setTranslatedDescription(null)
      setIsMachineTranslated(false)
      return
    }
    let cancelled = false
    apiClient
      .get(`/products/${product.productId}/description`, { params: { lang: i18n.language } })
      .then((res) => {
        if (cancelled) return
        setTranslatedDescription(res.data.translated ? res.data.description : null)
        setIsMachineTranslated(res.data.translated)
      })
      .catch(() => {
        if (cancelled) return
        setTranslatedDescription(null)
        setIsMachineTranslated(false)
      })
    return () => {
      cancelled = true
    }
  }, [product, i18n.language])

  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>
  if (!product) return <div className="container py-5">{t('productDetails.loading')}</div>

  const images = product.images.map((i) => i.imageUrl)
  const imageReady = images.length <= 1 || imageConfirmed
  const checkoutQuery = new URLSearchParams({
    age: selectedAgeGroup,
    image: images[activeImageIdx] || images[0] || '',
  }).toString()

  const handleBuyClick = (e) => {
    if (!selectedAgeGroup || !imageReady) {
      e.preventDefault()
      setValidationError(t('productDetails.selectAgeAndImage'))
    } else {
      setValidationError('')
    }
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-md-4">
          <h6>{t('productDetails.description')}</h6>
          {isMachineTranslated && (
            <p className="text-muted small mb-1 fst-italic">{t('productDetails.machineTranslated')}</p>
          )}
          <div
            dangerouslySetInnerHTML={{ __html: translatedDescription ?? product.description }}
            style={{ maxHeight: 500, overflowY: 'auto' }}
          />
        </div>

        <div className="col-md-4">
          {images.length > 0 ? (
            <>
              <img src={images[activeImageIdx] ?? images[0]} alt="" className="w-100 rounded" />
              <a href="#pd-tryon" data-bs-toggle="modal" data-bs-target="#pd-tryon" className="d-inline-block mt-2">
                {t('productDetails.tryOnLink')}
              </a>
            </>
          ) : (
            <div className="ktw-card-img d-flex align-items-center justify-content-center text-muted">
              {t('productDetails.noImage')}
            </div>
          )}
        </div>

        <div className="col-md-4">
          <h3>
            {product.productName} <small className="text-muted fw-normal">(#{product.productId})</small>
          </h3>
          <p className="text-muted">
            {product.vendorName} &middot; {product.modelName}
          </p>
          {product.dispatch != null && (
            <p>
              <i className="bi bi-truck me-1" /> {t('productDetails.dispatch', { days: product.dispatch })}
            </p>
          )}

          <div className="mb-3">
            {product.prices.map((p) => (
              <button
                key={p.productPriceId}
                type="button"
                onClick={() => setSelectedAgeGroup(p.ageGroup)}
                className="price-chip"
                style={{
                  font: 'inherit',
                  cursor: 'pointer',
                  outline: p.ageGroup === selectedAgeGroup ? '2px solid var(--ktw-purple)' : 'none',
                  outlineOffset: 1,
                }}
              >
                {formatAgeGroup(p.ageGroup, t('common.years'))}: ₹{p.price}
              </button>
            ))}
          </div>

          {product.sizeChartUrl && (
            <p className="mb-3">
              <a href={product.sizeChartUrl} data-bs-toggle="modal" data-bs-target="#pd-sizechart">
                {t('productDetails.viewSizeChart')}
              </a>
            </p>
          )}

          {images.length > 1 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {images.map((src, idx) => (
                <img
                  key={src + idx}
                  src={src}
                  alt=""
                  onClick={() => {
                    setActiveImageIdx(idx)
                    setImageConfirmed(true)
                  }}
                  className="rounded"
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: idx === activeImageIdx ? '2px solid var(--ktw-purple)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mb-3">
            <WhatsAppButton instaUrl={product.instaUrl} productName={product.productName} />
            {product.instaUrl && (
              <a href={product.instaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-insta">
                <i className="bi bi-instagram me-1" /> {t('productDetails.viewOnInsta')}
              </a>
            )}
            {ENABLE_BUY_NOW ? (
              <Link
                to={`/buy/${product.productId}?${checkoutQuery}`}
                className="btn btn-ktw-primary"
                onClick={handleBuyClick}
              >
                {t('productDetails.buyNow')}
              </Link>
            ) : (
              <a
                href={`/how-to-buy/${product.productId}?${checkoutQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ktw-primary"
                onClick={handleBuyClick}
              >
                {t('productDetails.howToBuy')}
              </a>
            )}
          </div>
          {validationError && <p className="text-danger small mb-3">{validationError}</p>}
        </div>
      </div>

      {images.length > 0 && (
        <TryOnModal modalId="pd-tryon" images={images} productName={product.productName} />
      )}

      {product.sizeChartUrl && (
        <div className="modal fade" id="pd-sizechart" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{t('productDetails.sizeChartModalTitle')}</h6>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body text-center">
                <img src={product.sizeChartUrl} alt="Size chart" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
