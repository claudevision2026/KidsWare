import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    apiClient
      .get('/orders/my')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>{t('myOrders.loading')}</p>

  if (orders.length === 0) {
    return <p className="text-muted">{t('myOrders.empty')}</p>
  }

  return (
    <div>
      <h4 className="mb-3">{t('myOrders.title')}</h4>
      <div className="table-responsive">
        <table className="table table-striped align-middle">
          <thead>
            <tr>
              <th>{t('myOrders.orderId')}</th>
              <th>{t('myOrders.product')}</th>
              <th>{t('myOrders.age')}</th>
              <th>{t('myOrders.price')}</th>
              <th>{t('myOrders.purchaseDate')}</th>
              <th>{t('myOrders.tracking')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId}>
                <td>{o.orderId}</td>
                <td>{o.productName}</td>
                <td>{o.age || '-'}</td>
                <td>{o.price != null ? `₹${o.price}` : '-'}</td>
                <td>{o.purchaseDate ? new Date(o.purchaseDate).toLocaleDateString() : '-'}</td>
                <td>
                  {o.trackingUrl ? (
                    <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">
                      {o.trackingId || t('myOrders.track')}
                    </a>
                  ) : (
                    o.trackingId || '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
