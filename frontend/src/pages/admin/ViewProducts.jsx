import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import apiClient from '../../api/client'
import ImageCarousel from '../../components/ImageCarousel'
import { formatAgeGroup } from '../../utils/format'

function ProductDetailPanel({ productId, vendors, models, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const [newSizechartFile, setNewSizechartFile] = useState(null)
  const [newImageFiles, setNewImageFiles] = useState([])
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    apiClient.get(`/admin/products/${productId}`).then((res) => {
      setDetail(res.data)
      setEditForm({
        productName: res.data.productName,
        vendorId: res.data.vendorId,
        modelId: res.data.modelId,
        dispatch: res.data.dispatch ?? '',
        instaUrl: res.data.instaUrl ?? '',
      })
      setEditDescription(res.data.description || '')
    })
  }

  useEffect(load, [productId])

  if (!detail) return <div className="p-3">Loading...</div>

  const handleSaveDetails = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await apiClient.put(`/admin/products/${productId}`, {
        productName: editForm.productName,
        vendorId: Number(editForm.vendorId),
        modelId: Number(editForm.modelId),
        description: editDescription,
        dispatch: editForm.dispatch ? Number(editForm.dispatch) : null,
        instaUrl: editForm.instaUrl,
      })
      setEditing(false)
      load()
      onChanged()
    } catch {
      setMessage({ type: 'danger', text: 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      productName: detail.productName,
      vendorId: detail.vendorId,
      modelId: detail.modelId,
      dispatch: detail.dispatch ?? '',
      instaUrl: detail.instaUrl ?? '',
    })
    setEditDescription(detail.description || '')
    setEditing(false)
  }

  const handleDeleteImage = async (imageId) => {
    await apiClient.patch(`/admin/products/images/${imageId}/status?status=N`)
    load()
    onChanged()
  }

  const handleAddImages = async () => {
    if (newImageFiles.length === 0) return
    const fd = new FormData()
    newImageFiles.forEach((f) => fd.append('dressImages', f))
    await apiClient.post(`/admin/products/${productId}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setNewImageFiles([])
    load()
    onChanged()
  }

  const handleReplaceSizechart = async () => {
    if (!newSizechartFile) return
    const fd = new FormData()
    fd.append('sizechart', newSizechartFile)
    await apiClient.put(`/admin/products/${productId}/sizechart`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setNewSizechartFile(null)
    load()
    onChanged()
  }

  const handleAddPriceRow = async () => {
    await apiClient.post(`/admin/products/${productId}/prices`, {
      ageGroup: 'New',
      price: 0,
      stockCount: 0,
    })
    load()
  }

  const handlePriceChange = async (priceId, field, value) => {
    const row = detail.prices.find((p) => p.productPriceId === priceId)
    const payload = {
      ageGroup: field === 'ageGroup' ? value : row.ageGroup,
      price: field === 'price' ? Number(value) : row.price,
      stockCount: field === 'stockCount' ? Number(value) : row.stockCount,
    }
    await apiClient.put(`/admin/products/prices/${priceId}`, payload)
  }

  const handleDeletePrice = async (priceId) => {
    await apiClient.delete(`/admin/products/prices/${priceId}`)
    load()
  }

  return (
    <div className="card ktw-card mt-2 mb-4 p-3 detail-scroll">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h5>{detail.productName}</h5>
        <div>
          {!editing ? (
            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : (
            <>
              <button className="btn btn-sm btn-ktw-primary me-2" onClick={handleSaveDetails} disabled={saving}>
                Save
              </button>
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
          <button className="btn btn-sm btn-outline-dark" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}

      <div className="mb-3">
        <label className="form-label small fw-semibold">Dress Images</label>
        <div className="d-flex flex-wrap">
          {detail.images.map((img, idx) => (
            <div className="image-thumb-wrap" key={img.productImageId}>
              <img
                src={img.imageUrl}
                alt=""
                role={!editing && detail.images.length > 1 ? 'button' : undefined}
                style={!editing && detail.images.length > 1 ? { cursor: 'pointer' } : undefined}
                data-bs-target={!editing && detail.images.length > 1 ? `#carousel-${productId}` : undefined}
                data-bs-slide-to={!editing && detail.images.length > 1 ? idx : undefined}
              />
              {editing && (
                <button
                  className="btn btn-sm btn-danger btn-remove-img"
                  onClick={() => handleDeleteImage(img.productImageId)}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-2 d-flex gap-2 align-items-center">
            <input
              type="file"
              accept="image/*"
              multiple
              className="form-control form-control-sm"
              style={{ maxWidth: 300 }}
              onChange={(e) => setNewImageFiles(Array.from(e.target.files))}
            />
            <button className="btn btn-sm btn-outline-secondary" onClick={handleAddImages}>
              Add Images
            </button>
          </div>
        )}
        {!editing && detail.images.length > 1 && (
          <div className="mt-2" style={{ maxWidth: 400 }}>
            <ImageCarousel images={detail.images.map((i) => i.imageUrl)} carouselId={`carousel-${productId}`} heightClass="rounded" />
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label small fw-semibold">Size Chart</label>
        <div>
          {detail.sizeChartUrl && <img src={detail.sizeChartUrl} alt="Size chart" style={{ width: 140 }} className="rounded border mb-2" />}
        </div>
        {editing && (
          <div className="d-flex gap-2 align-items-center">
            <input
              type="file"
              accept="image/*"
              className="form-control form-control-sm"
              style={{ maxWidth: 300 }}
              onChange={(e) => setNewSizechartFile(e.target.files[0])}
            />
            <button className="btn btn-sm btn-outline-secondary" onClick={handleReplaceSizechart}>
              Replace
            </button>
          </div>
        )}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label small">Product Name</label>
          {editing ? (
            <input
              className="form-control"
              value={editForm.productName}
              onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
            />
          ) : (
            <p className="mb-0">{detail.productName}</p>
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small">Vendor</label>
          {editing ? (
            <select
              className="form-select"
              value={editForm.vendorId}
              onChange={(e) => setEditForm({ ...editForm, vendorId: e.target.value })}
            >
              {vendors.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.vendorName}
                </option>
              ))}
            </select>
          ) : (
            <p className="mb-0">{detail.vendorName}</p>
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small">Model</label>
          {editing ? (
            <select
              className="form-select"
              value={editForm.modelId}
              onChange={(e) => setEditForm({ ...editForm, modelId: e.target.value })}
            >
              {models.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelName}
                </option>
              ))}
            </select>
          ) : (
            <p className="mb-0">{detail.modelName}</p>
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label small">Dispatch (days)</label>
          {editing ? (
            <input
              type="number"
              className="form-control"
              value={editForm.dispatch}
              onChange={(e) => setEditForm({ ...editForm, dispatch: e.target.value })}
            />
          ) : (
            <p className="mb-0">{detail.dispatch ?? '-'}</p>
          )}
        </div>
        <div className="col-md-8">
          <label className="form-label small">Instagram URL</label>
          {editing ? (
            <input
              className="form-control"
              value={editForm.instaUrl}
              onChange={(e) => setEditForm({ ...editForm, instaUrl: e.target.value })}
            />
          ) : detail.instaUrl ? (
            <p className="mb-0">
              <a href={detail.instaUrl} target="_blank" rel="noopener noreferrer">
                {detail.instaUrl}
              </a>
            </p>
          ) : (
            <p className="mb-0">-</p>
          )}
        </div>
        <div className="col-12">
          <label className="form-label small">Description</label>
          {editing ? (
            <ReactQuill theme="snow" value={editDescription} onChange={setEditDescription} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: detail.description || '' }} />
          )}
        </div>
      </div>

      <div>
        <label className="form-label small fw-semibold">Prices</label>
        <div className="d-flex flex-wrap align-items-center">
          {detail.prices.map((p) =>
            editing ? (
              <div className="d-flex gap-1 align-items-center border rounded p-2 m-1" key={p.productPriceId}>
                <input
                  className="form-control form-control-sm"
                  style={{ width: 90 }}
                  defaultValue={p.ageGroup}
                  onBlur={(e) => handlePriceChange(p.productPriceId, 'ageGroup', e.target.value)}
                />
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 80 }}
                  defaultValue={p.price}
                  onBlur={(e) => handlePriceChange(p.productPriceId, 'price', e.target.value)}
                />
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePrice(p.productPriceId)}>
                  &times;
                </button>
              </div>
            ) : (
              <span className="price-chip" key={p.productPriceId}>
                {formatAgeGroup(p.ageGroup)}: ₹{p.price}
              </span>
            )
          )}
        </div>
        {editing && (
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={handleAddPriceRow}>
            + Add Price Row
          </button>
        )}
      </div>
    </div>
  )
}

export default function ViewProducts() {
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [models, setModels] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')

  const loadProducts = () => {
    apiClient.get('/admin/products').then((res) => setProducts(res.data))
  }

  useEffect(() => {
    loadProducts()
    apiClient.get('/vendors').then((res) => setVendors(res.data))
    apiClient.get('/models').then((res) => setModels(res.data))
  }, [])

  const searchTerm = search.trim().toLowerCase()
  const filteredProducts = !searchTerm
    ? products
    : products.filter(
        (p) =>
          p.vendorName.toLowerCase().includes(searchTerm) ||
          p.productName.toLowerCase().includes(searchTerm) ||
          p.modelName.toLowerCase().includes(searchTerm)
      )

  return (
    <div>
      <h4 className="mb-4">View Products</h4>
      <div className="mb-3" style={{ maxWidth: 300 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search by product, vendor, or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="row">
        {filteredProducts.map((p) => (
          <div className="col-12" key={p.productId}>
            <div className="card ktw-card mb-3">
              <div className="row g-0 align-items-center">
                <div className="col-2">
                  <img
                    src={p.thumbnailUrl || 'https://placehold.co/200x200?text=KTW'}
                    alt=""
                    className="img-fluid rounded-start"
                    style={{ height: 120, width: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="col-3">
                  <div className="p-2">
                    <h6 className="mb-1">{p.productName}</h6>
                    <small className="text-muted">
                      {p.vendorName} &middot; {p.modelName}
                    </small>
                  </div>
                </div>
                <div className="col-3">
                  {p.sizeChartUrl && (
                    <a
                      href={p.sizeChartUrl}
                      data-bs-toggle="modal"
                      data-bs-target={`#sc-${p.productId}`}
                    >
                      View Size Chart
                    </a>
                  )}
                </div>
                <div className="col-2">
                  <button
                    className="btn btn-sm btn-ktw-primary"
                    onClick={() => setExpandedId(expandedId === p.productId ? null : p.productId)}
                  >
                    {expandedId === p.productId ? 'Hide' : 'View More'}
                  </button>
                </div>
              </div>
            </div>

            {p.sizeChartUrl && (
              <div className="modal fade" id={`sc-${p.productId}`} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h6 className="modal-title">Size Chart</h6>
                      <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body text-center">
                      <img src={p.sizeChartUrl} alt="Size chart" className="img-fluid" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {expandedId === p.productId && (
              <ProductDetailPanel
                productId={p.productId}
                vendors={vendors}
                models={models}
                onClose={() => setExpandedId(null)}
                onChanged={loadProducts}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
