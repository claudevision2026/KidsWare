import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-2 admin-sidebar py-4 px-2">
          <nav className="nav flex-column">
            <NavLink className="nav-link" to="/admin/products/new">
              <i className="bi bi-plus-circle me-2" /> New Product
            </NavLink>
            <NavLink className="nav-link" to="/admin/products">
              <i className="bi bi-grid me-2" /> View Products
            </NavLink>
            <NavLink className="nav-link" to="/admin/orders">
              <i className="bi bi-receipt me-2" /> View Orders
            </NavLink>
            <NavLink className="nav-link" to="/admin/users">
              <i className="bi bi-people me-2" /> Users
            </NavLink>
          </nav>
        </div>
        <div className="col-md-10 py-4">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
