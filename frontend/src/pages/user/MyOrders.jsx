import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'

export default function MyOrders() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    apiClient
      .get('/orders/my')
      .then((res) => setGroups(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>{t('myOrders.loading')}</p>

  if (groups.length === 0) {
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
              <th>{t('cart.quantity')}</th>
              <th>{t('myOrders.purchaseDate')}</th>
              <th>{t('myOrders.tracking')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isGrouped = group.items.length > 1
              return (
                <Fragment key={group.transactionId ?? group.items[0].orderId}>
                  {group.items.map((o) => (
                    <tr key={o.orderId} className={isGrouped ? 'table-active' : undefined}>
                      <td>{o.orderId}</td>
                      <td>{o.productName}</td>
                      <td>{o.age || '-'}</td>
                      <td>{o.price != null ? `₹${o.price}` : '-'}</td>
                      <td>{o.quantity}</td>
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
                  {isGrouped && (
                    <tr className="table-active">
                      <td colSpan={7} className="text-end fw-bold">
                        {t('cart.total')}: ₹{group.total}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
