import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    apiClient
      .get('/products/latest')
      .then((res) => setProducts(res.data))
      .catch(() => setError(t('home.loadError')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container py-4">
      <h3 className="mb-4">{t('home.latestArrivals')}</h3>
      {loading && <p>{t('home.loading')}</p>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && products.length === 0 && <p className="text-muted">{t('home.noProducts')}</p>}
      <div className="row">
        {products.map((p) => (
          <ProductCard key={p.productId} product={p} />
        ))}
      </div>
    </div>
  )
}
