import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../api/client'

export default function ViewUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/admin/users')
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false))
  }, [])

  const searchTerm = search.trim().toLowerCase()
  const filteredUsers = !searchTerm
    ? users
    : users.filter((u) =>
        [u.phoneNumber, u.email, u.role, u.firstName, u.lastName].some(
          (field) => field && field.toLowerCase().includes(searchTerm)
        )
      )

  const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '-'

  return (
    <div>
      <h4 className="mb-4">Users</h4>
      <div className="mb-3" style={{ maxWidth: 300 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search by phone, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-sm align-middle">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created Date</th>
                <th>Temp Password</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.userId}>
                  <td>{u.phoneNumber}</td>
                  <td>{fullName(u)}</td>
                  <td>{u.email || '-'}</td>
                  <td>{u.role}</td>
                  <td>{u.createdDate ? new Date(u.createdDate).toLocaleDateString() : '-'}</td>
                  <td>{u.tempPassword ? <span className="font-monospace">{u.tempPassword}</span> : '-'}</td>
                  <td>
                    {u.hasOrders ? (
                      <Link
                        className="btn btn-outline-primary btn-sm"
                        to={`/admin/orders?phoneNumber=${encodeURIComponent(u.phoneNumber)}`}
                      >
                        View Orders
                      </Link>
                    ) : (
                      <button className="btn btn-outline-secondary btn-sm" disabled>
                        View Orders
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
