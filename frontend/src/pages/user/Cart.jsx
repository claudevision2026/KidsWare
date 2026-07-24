import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'
import { useCart } from '../../context/CartContext'
import { formatAgeGroup } from '../../utils/format'

export default function Cart() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const { refreshCartCount } = useCart()
  const { t } = useTranslation()

  const loadCart = () => {
    return apiClient.get('/cart').then((res) => {
      setItems(res.data.items)
      setTotal(res.data.total)
    })
  }

  useEffect(() => {
    loadCart().finally(() => setLoading(false))
  }, [])

  const recomputeTotal = (nextItems) => {
    setTotal(nextItems.reduce((sum, i) => sum + i.lineTotal, 0))
  }

  const handleQuantityChange = async (item, nextQuantity) => {
    const res = await apiClient.put(`/cart/items/${item.cartItemId}`, { quantity: nextQuantity })
    const updated = items.map((i) => (i.cartItemId === item.cartItemId ? res.data : i))
    setItems(updated)
    recomputeTotal(updated)
    refreshCartCount()
  }

  const handleRemove = async (item) => {
    await apiClient.delete(`/cart/items/${item.cartItemId}`)
    const updated = items.filter((i) => i.cartItemId !== item.cartItemId)
    setItems(updated)
    recomputeTotal(updated)
    refreshCartCount()
  }

  if (loading) return <p>{t('cart.loading')}</p>

  if (items.length === 0) {
    return (
      <div>
        <p className="text-muted">{t('cart.empty')}</p>
        <Link to="/">{t('cart.browseDresses')}</Link>
      </div>
    )
  }

  return (
    <div>
      <h4 className="mb-3">{t('cart.title')}</h4>
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead>
            <tr>
              <th></th>
              <th>{t('myOrders.product')}</th>
              <th>{t('myOrders.age')}</th>
              <th>{t('myOrders.price')}</th>
              <th>{t('cart.quantity')}</th>
              <th>{t('cart.total')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.cartItemId}>
                <td style={{ width: 72 }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      style={{ width: 56, height: 56, objectFit: 'cover' }}
                      className="rounded"
                    />
                  ) : (
                    <div
                      className="ktw-card-img d-flex align-items-center justify-content-center text-muted rounded"
                      style={{ width: 56, height: 56 }}
                    >
                      {t('productDetails.noImage')}
                    </div>
                  )}
                </td>
                <td>{item.productName}</td>
                <td>{formatAgeGroup(item.ageGroup, t('common.years'))}</td>
                <td>₹{item.price}</td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={item.quantity === 1}
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  {item.quantity > item.stockCount && (
                    <p className="text-muted small mb-0 mt-1">
                      {t('cart.lowStock', { count: item.stockCount })}
                    </p>
                  )}
                </td>
                <td>₹{item.lineTotal}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemove(item)}
                  >
                    {t('cart.remove')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-end fw-bold fs-5">
        {t('cart.total')}: ₹{total}
      </div>
      <div className="text-end mt-3">
        <Link to="/cart/checkout" className="btn btn-ktw-primary">
          {t('cart.checkout')}
        </Link>
      </div>
    </div>
  )
}
