import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'

const emptyOrderForm = () => ({
  productId: '',
  phoneNumber: '',
  customerFirstName: '',
  customerLastName: '',
  age: '',
  price: '',
  transactionId: '',
  purchaseDate: '',
  vendorId: '',
  modelId: '',
  courierVendor: '',
  trackingId: '',
  trackingUrl: '',
})

const emptyNewAddress = () => ({
  recipientName: '',
  recipientPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pinCode: '',
})

export default function ViewOrders() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [models, setModels] = useState([])
  const [form, setForm] = useState(emptyOrderForm())
  const [editingId, setEditingId] = useState(null)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('phoneNumber') || '')
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Phone lookup / address selection state
  const [lookup, setLookup] = useState(null) // { exists, phoneNumber, userId, email, addresses }
  const [lookupLoading, setLookupLoading] = useState(false)
  const [addressMode, setAddressMode] = useState('existing') // 'existing' | 'new'
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [newAddress, setNewAddress] = useState(emptyNewAddress())

  // Warning banner after a new user is auto-created
  const [newUserAlert, setNewUserAlert] = useState(null) // { phoneNumber, tempPassword }
  const [copied, setCopied] = useState(false)

  const loadOrders = () => {
    apiClient.get('/admin/orders').then((res) => setOrders(res.data))
  }

  useEffect(() => {
    loadOrders()
    apiClient.get('/admin/products').then((res) => setProducts(res.data))
    apiClient.get('/vendors').then((res) => setVendors(res.data))
    apiClient.get('/models').then((res) => setModels(res.data))
  }, [])

  const searchTerm = search.trim().toLowerCase()
  const filteredOrders = !searchTerm
    ? orders
    : orders.filter((o) =>
        [o.productName, o.phoneNumber, o.transactionId, o.trackingId, o.courierVendor]
          .some((field) => field && field.toLowerCase().includes(searchTerm))
      )

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const updateNewAddress = (field) => (e) => setNewAddress({ ...newAddress, [field]: e.target.value })

  const toDateInputValue = (isoString) => (isoString ? isoString.slice(0, 10) : '')

  const resetAddressState = () => {
    setLookup(null)
    setAddressMode('existing')
    setSelectedAddressId('')
    setNewAddress(emptyNewAddress())
  }

  const handlePhoneChange = (e) => {
    // Any edit to the phone invalidates any previous lookup/selection so we
    // never submit an address or name that belongs to a different person.
    setForm({ ...form, phoneNumber: e.target.value, customerFirstName: '', customerLastName: '' })
    resetAddressState()
  }

  const handlePhoneBlur = async () => {
    const phoneNumber = form.phoneNumber.trim()
    if (!phoneNumber || editingId) return
    setLookupLoading(true)
    try {
      const res = await apiClient.get('/admin/orders/lookup-user', { params: { phoneNumber } })
      setLookup(res.data)
      if (res.data.exists) {
        setForm((f) => ({
          ...f,
          customerFirstName: res.data.firstName || '',
          customerLastName: res.data.lastName || '',
        }))
      }
      if (res.data.exists && res.data.addresses?.length > 0) {
        const defaultAddress = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0]
        setSelectedAddressId(String(defaultAddress.userAddressId))
        setAddressMode('existing')
      } else {
        setAddressMode('new')
      }
    } catch {
      setLookup(null)
      setAddressMode('new')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleEdit = (order) => {
    setEditingId(order.orderId)
    setMessage(null)
    resetAddressState()
    setForm({
      productId: order.productId ?? '',
      phoneNumber: order.phoneNumber ?? '',
      customerFirstName: '',
      customerLastName: '',
      age: order.age ?? '',
      price: order.price ?? '',
      transactionId: order.transactionId ?? '',
      purchaseDate: toDateInputValue(order.purchaseDate),
      vendorId: order.vendorId ?? '',
      modelId: order.modelId ?? '',
      courierVendor: order.courierVendor ?? '',
      trackingId: order.trackingId ?? '',
      trackingUrl: order.trackingUrl ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setForm(emptyOrderForm())
    setMessage(null)
    resetAddressState()
  }

  const hasExistingAddresses = lookup?.exists && lookup.addresses?.length > 0

  const buildAddressPayload = () => {
    if (hasExistingAddresses && addressMode === 'existing' && selectedAddressId) {
      return { userAddressId: Number(selectedAddressId) }
    }
    return {
      newAddress: {
        recipientName: newAddress.recipientName || null,
        recipientPhone: newAddress.recipientPhone || null,
        addressLine1: newAddress.addressLine1,
        addressLine2: newAddress.addressLine2 || null,
        city: newAddress.city,
        state: newAddress.state,
        pinCode: newAddress.pinCode,
      },
    }
  }

  const handleCopyTempPassword = () => {
    if (!newUserAlert) return
    navigator.clipboard.writeText(newUserAlert.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    const body = {
      productId: Number(form.productId),
      phoneNumber: form.phoneNumber,
      customerFirstName: form.customerFirstName || null,
      customerLastName: form.customerLastName || null,
      age: form.age || null,
      price: form.price ? Number(form.price) : null,
      transactionId: form.transactionId || null,
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : null,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
      modelId: form.modelId ? Number(form.modelId) : null,
      courierVendor: form.courierVendor || null,
      trackingId: form.trackingId || null,
      trackingUrl: form.trackingUrl || null,
      // Address selection/lookup only happens for new-order entry; when editing
      // an existing order we leave its address untouched (fields omitted).
      ...(editingId ? {} : buildAddressPayload()),
    }
    try {
      if (editingId) {
        await apiClient.put(`/admin/orders/${editingId}`, body)
        setMessage({ type: 'success', text: 'Order updated' })
      } else {
        const res = await apiClient.post('/admin/orders', body)
        setMessage({ type: 'success', text: 'Order saved' })
        if (res.data.newUserCreated) {
          setNewUserAlert({ phoneNumber: res.data.order.phoneNumber, tempPassword: res.data.tempPassword })
        }
      }
      setEditingId(null)
      setForm(emptyOrderForm())
      resetAddressState()
      loadOrders()
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Failed to save order' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h4 className="mb-4">View / Add Orders</h4>

      {newUserAlert && (
        <div className="alert alert-warning alert-dismissible d-flex justify-content-between align-items-center">
          <div>
            A new customer account was created for <strong>{newUserAlert.phoneNumber}</strong> with temporary
            password <strong>{newUserAlert.tempPassword}</strong>. Share it with the customer — it can also be
            looked up later on the Users admin page.
          </div>
          <div className="d-flex align-items-center ms-2">
            <button type="button" className="btn btn-sm btn-outline-dark me-2" onClick={handleCopyTempPassword}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button type="button" className="btn-close" onClick={() => setNewUserAlert(null)} />
          </div>
        </div>
      )}

      <div className="card ktw-card p-3 mb-4">
        <h6 className="mb-3">{editingId ? `Edit Order #${editingId}` : 'Add Order (manual entry)'}</h6>
        {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small">Product</label>
              <select className="form-select form-select-sm" value={form.productId} onChange={update('productId')} required>
                <option value="">Select...</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Phone Number</label>
              <input
                className="form-control form-control-sm"
                value={form.phoneNumber}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                required
              />
              {lookupLoading && <div className="form-text">Looking up customer...</div>}
              {!lookupLoading && lookup?.exists && (
                <div className="form-text text-success">Existing customer{lookup.email ? ` (${lookup.email})` : ''}</div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label small">Customer First Name</label>
              <input className="form-control form-control-sm" value={form.customerFirstName} onChange={update('customerFirstName')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Customer Last Name</label>
              <input className="form-control form-control-sm" value={form.customerLastName} onChange={update('customerLastName')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Age</label>
              <input className="form-control form-control-sm" value={form.age} onChange={update('age')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Price</label>
              <input type="number" className="form-control form-control-sm" value={form.price} onChange={update('price')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Transaction ID</label>
              <input className="form-control form-control-sm" value={form.transactionId} onChange={update('transactionId')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Purchase Date</label>
              <input type="date" className="form-control form-control-sm" value={form.purchaseDate} onChange={update('purchaseDate')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Vendor</label>
              <select className="form-select form-select-sm" value={form.vendorId} onChange={update('vendorId')}>
                <option value="">-</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.vendorName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Model</label>
              <select className="form-select form-select-sm" value={form.modelId} onChange={update('modelId')}>
                <option value="">-</option>
                {models.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.modelName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Courier Vendor</label>
              <input className="form-control form-control-sm" value={form.courierVendor} onChange={update('courierVendor')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Tracking ID</label>
              <input className="form-control form-control-sm" value={form.trackingId} onChange={update('trackingId')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Tracking URL</label>
              <input className="form-control form-control-sm" value={form.trackingUrl} onChange={update('trackingUrl')} />
            </div>
          </div>

          {!editingId && (
          <div className="border rounded p-2 mt-3">
            <label className="form-label small fw-semibold mb-2">Shipping Address</label>

            {hasExistingAddresses && (
              <div className="mb-2">
                <div className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="addr-mode-existing"
                    name="addressMode"
                    checked={addressMode === 'existing'}
                    onChange={() => setAddressMode('existing')}
                  />
                  <label className="form-check-label small" htmlFor="addr-mode-existing">
                    Ship to an existing address
                  </label>
                </div>
                {addressMode === 'existing' && (
                  <select
                    className="form-select form-select-sm mt-1"
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                  >
                    {lookup.addresses.map((a) => (
                      <option key={a.userAddressId} value={a.userAddressId}>
                        {a.addressLine1}, {a.city} {a.pinCode}
                        {a.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <div className="form-check mt-2">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="addr-mode-new"
                    name="addressMode"
                    checked={addressMode === 'new'}
                    onChange={() => setAddressMode('new')}
                  />
                  <label className="form-check-label small" htmlFor="addr-mode-new">
                    Use a different address
                  </label>
                </div>
              </div>
            )}

            {(!hasExistingAddresses || addressMode === 'new') && (
              <div className="row g-2 mt-1">
                <div className="col-md-3">
                  <label className="form-label small">Recipient Name</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.recipientName}
                    onChange={updateNewAddress('recipientName')}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Recipient Phone</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.recipientPhone}
                    onChange={updateNewAddress('recipientPhone')}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Address Line 1</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.addressLine1}
                    onChange={updateNewAddress('addressLine1')}
                    required={!hasExistingAddresses || addressMode === 'new'}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Address Line 2</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.addressLine2}
                    onChange={updateNewAddress('addressLine2')}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">City</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.city}
                    onChange={updateNewAddress('city')}
                    required={!hasExistingAddresses || addressMode === 'new'}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">State</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.state}
                    onChange={updateNewAddress('state')}
                    required={!hasExistingAddresses || addressMode === 'new'}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Pin Code</label>
                  <input
                    className="form-control form-control-sm"
                    value={newAddress.pinCode}
                    onChange={updateNewAddress('pinCode')}
                    required={!hasExistingAddresses || addressMode === 'new'}
                  />
                </div>
              </div>
            )}
          </div>
          )}

          <button type="submit" className="btn btn-ktw-primary btn-sm mt-3" disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Order' : 'Save Order'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-3 ms-2"
              onClick={handleCancelEdit}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="mb-3" style={{ maxWidth: 400 }}>
        <label className="form-label small">Search (product, phone, transaction ID, tracking ID, or courier)</label>
        <input className="form-control form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Phone</th>
              <th>Age</th>
              <th>Price</th>
              <th>Transaction ID</th>
              <th>Purchase Date</th>
              <th>Address</th>
              <th>Courier</th>
              <th>Tracking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.orderId} className={editingId === o.orderId ? 'table-active' : ''}>
                <td>{o.orderId}</td>
                <td>{o.productName}</td>
                <td>{o.phoneNumber}</td>
                <td>{o.age || '-'}</td>
                <td>{o.price != null ? `₹${o.price}` : '-'}</td>
                <td>{o.transactionId || '-'}</td>
                <td>{o.purchaseDate ? new Date(o.purchaseDate).toLocaleDateString() : '-'}</td>
                <td>{o.address ? `${o.address.city}, ${o.address.pinCode}` : '-'}</td>
                <td>{o.courierVendor || '-'}</td>
                <td>
                  {o.trackingUrl ? (
                    <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">
                      {o.trackingId || 'Track'}
                    </a>
                  ) : (
                    o.trackingId || '-'
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleEdit(o)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
