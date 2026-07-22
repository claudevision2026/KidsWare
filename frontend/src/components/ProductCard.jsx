import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ProductCard({ product }) {
  const { t } = useTranslation()

  return (
    <div className="col-sm-6 col-md-4 col-lg-3 mb-4">
      <div className="card ktw-card h-100">
        <img
          src={product.thumbnailUrl || 'https://placehold.co/400x400?text=KTW'}
          alt={product.productName}
          className="ktw-card-img w-100"
        />
        <div className="card-body d-flex flex-column">
          <h6 className="card-title mb-1">{product.productName}</h6>
          <p className="text-muted small mb-2">
            {product.vendorName} &middot; {product.modelName}
          </p>
          {product.sizeChartUrl && (
            <a
              href={product.sizeChartUrl}
              data-bs-toggle="modal"
              data-bs-target={`#sizechart-${product.productId}`}
              className="small mb-2"
            >
              {t('productCard.viewSizeChart')}
            </a>
          )}
          <Link to={`/products/${product.productId}`} className="btn btn-ktw-primary btn-sm mt-auto">
            {t('productCard.viewMore')}
          </Link>
        </div>
      </div>

      {product.sizeChartUrl && (
        <div className="modal fade" id={`sizechart-${product.productId}`} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{t('productCard.sizeChartTitle', { name: product.productName })}</h6>
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
