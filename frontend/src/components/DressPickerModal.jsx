import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { formatAgeGroup } from '../utils/format'

// Lets the buyer pick a different photo/age of the SAME product they're already looking
// at (never a different product) — scoped to `productId`, not the wider catalog.
export default function DressPickerModal({ modalId, productId, onSelect }) {
  const { t } = useTranslation()
  const [product, setProduct] = useState(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [ageGroup, setAgeGroup] = useState('')

  useEffect(() => {
    if (!productId) return
    apiClient.get(`/products/${productId}`).then((res) => {
      setProduct(res.data)
      setActiveImageIdx(0)
      setAgeGroup(res.data.prices[0]?.ageGroup || '')
    })
  }, [productId])

  const images = product?.images.map((i) => i.imageUrl) || []

  return (
    <div className="modal fade" id={modalId} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">{t('checkout.dressPicker.title')}</h6>
            <button type="button" className="btn-close" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body">
            {!product ? (
              <p>{t('productDetails.loading')}</p>
            ) : (
              <>
                <img
                  src={images[activeImageIdx] || 'https://placehold.co/300x300?text=KTW'}
                  alt=""
                  className="w-100 rounded mb-2"
                  style={{ height: 260, objectFit: 'contain', background: '#f8f8f8' }}
                />
                {images.length > 1 && (
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {images.map((src, idx) => (
                      <img
                        key={src + idx}
                        src={src}
                        alt=""
                        onClick={() => setActiveImageIdx(idx)}
                        className="rounded"
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: idx === activeImageIdx ? '2px solid var(--ktw-purple)' : '2px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                )}

                <p className="fw-semibold mb-1">
                  {product.productName} <span className="text-muted fw-normal">(#{product.productId})</span>
                </p>
                <p className="text-muted small mb-3">
                  {product.vendorName} &middot; {product.modelName}
                </p>

                <select
                  className="form-select form-select-sm mb-3"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                >
                  {product.prices.map((pr) => (
                    <option key={pr.productPriceId} value={pr.ageGroup}>
                      {formatAgeGroup(pr.ageGroup, t('common.years'))}: ₹{pr.price}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-ktw-primary w-100"
                  disabled={!ageGroup}
                  onClick={() => onSelect(product.productId, ageGroup, images[activeImageIdx])}
                >
                  {t('checkout.dressPicker.update')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
