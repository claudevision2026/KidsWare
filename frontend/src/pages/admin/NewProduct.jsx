import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import apiClient from '../../api/client'

const emptyPriceRow = () => ({ ageGroup: '', price: '', stockCount: '' })

export default function NewProduct() {
  const [vendors, setVendors] = useState([])
  const [models, setModels] = useState([])
  const [form, setForm] = useState({
    productName: '',
    vendorId: '',
    modelId: '',
    dispatch: '',
    instaUrl: '',
  })
  const [description, setDescription] = useState('')
  const [priceRows, setPriceRows] = useState([emptyPriceRow()])
  const [sizechartFile, setSizechartFile] = useState(null)
  const [dressImageFiles, setDressImageFiles] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get('/vendors').then((res) => setVendors(res.data))
    apiClient.get('/models').then((res) => setModels(res.data))
  }, [])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const updatePriceRow = (idx, field, value) => {
    const next = [...priceRows]
    next[idx][field] = value
    setPriceRows(next)
  }

  const addPriceRow = () => setPriceRows([...priceRows, emptyPriceRow()])
  const removePriceRow = (idx) => setPriceRows(priceRows.filter((_, i) => i !== idx))

  const resetForm = () => {
    setForm({ productName: '', vendorId: '', modelId: '', dispatch: '', instaUrl: '' })
    setDescription('')
    setPriceRows([emptyPriceRow()])
    setSizechartFile(null)
    setDressImageFiles([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!sizechartFile) {
      setMessage({ type: 'danger', text: 'Please upload a size chart image' })
      return
    }
    if (dressImageFiles.length === 0) {
      setMessage({ type: 'danger', text: 'Please upload at least one dress image' })
      return
    }

    const cleanedPrices = priceRows
      .filter((r) => r.ageGroup && r.price)
      .map((r) => ({ ageGroup: r.ageGroup, price: Number(r.price), stockCount: Number(r.stockCount || 0) }))

    if (cleanedPrices.length === 0) {
      setMessage({ type: 'danger', text: 'Please add at least one price row' })
      return
    }

    const fd = new FormData()
    fd.append('productName', form.productName)
    fd.append('vendorId', form.vendorId)
    fd.append('modelId', form.modelId)
    fd.append('description', description)
    if (form.dispatch) fd.append('dispatch', form.dispatch)
    fd.append('instaUrl', form.instaUrl)
    fd.append('prices', JSON.stringify(cleanedPrices))
    fd.append('sizechart', sizechartFile)
    dressImageFiles.forEach((file) => fd.append('dressImages', file))

    setSubmitting(true)
    try {
      await apiClient.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage({ type: 'success', text: 'Product created successfully!' })
      resetForm()
    } catch (err) {
      const detail = err.response?.data?.detail
      setMessage({
        type: 'danger',
        text: Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail || 'Failed to create product',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h4 className="mb-4">New Product</h4>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="productName">Product Name</label>
            <input id="productName" className="form-control" value={form.productName} onChange={update('productName')} required />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="vendorId">Vendor</label>
            <select id="vendorId" className="form-select" value={form.vendorId} onChange={update('vendorId')} required>
              <option value="">Select...</option>
              {vendors.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.vendorName}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="modelId">Model</label>
            <select id="modelId" className="form-select" value={form.modelId} onChange={update('modelId')} required>
              <option value="">Select...</option>
              {models.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Description</label>
            <ReactQuill theme="snow" value={description} onChange={setDescription} />
          </div>

          <div className="col-md-4">
            <label className="form-label" htmlFor="dispatch">Dispatch (days)</label>
            <input id="dispatch" type="number" className="form-control" value={form.dispatch} onChange={update('dispatch')} />
          </div>
          <div className="col-md-8">
            <label className="form-label" htmlFor="instaUrl">Instagram URL</label>
            <input id="instaUrl" className="form-control" value={form.instaUrl} onChange={update('instaUrl')} />
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="sizechartFile">Size Chart Image</label>
            <input
              id="sizechartFile"
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => setSizechartFile(e.target.files[0])}
              required
            />
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="dressImageFiles">Dress Images (multiple)</label>
            <input
              id="dressImageFiles"
              type="file"
              accept="image/*"
              multiple
              className="form-control"
              onChange={(e) => setDressImageFiles(Array.from(e.target.files))}
              required
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold">Prices by Age Group</label>
            {priceRows.map((row, idx) => (
              <div className="row g-2 mb-2 align-items-center" key={idx}>
                <div className="col-4">
                  <input
                    className="form-control"
                    placeholder="Age group e.g. 0-3"
                    value={row.ageGroup}
                    onChange={(e) => updatePriceRow(idx, 'ageGroup', e.target.value)}
                  />
                </div>
                <div className="col-3">
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price"
                      value={row.price}
                      onChange={(e) => updatePriceRow(idx, 'price', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-3">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Stock count"
                    value={row.stockCount}
                    onChange={(e) => updatePriceRow(idx, 'stockCount', e.target.value)}
                  />
                </div>
                <div className="col-2">
                  {priceRows.length > 1 && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removePriceRow(idx)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline-secondary btn-sm mt-1" onClick={addPriceRow}>
              + Add Price Row
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-ktw-primary mt-4" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Product'}
        </button>
      </form>
    </div>
  )
}
