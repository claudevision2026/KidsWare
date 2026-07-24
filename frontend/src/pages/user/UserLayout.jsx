import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function UserLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-2 admin-sidebar py-4 px-2">
          <nav className="nav flex-column">
            <NavLink className="nav-link" to="/" end>
              <i className="bi bi-stars me-2" /> {t('userLayout.new')}
            </NavLink>
            <NavLink className="nav-link" to="/my-orders">
              <i className="bi bi-receipt me-2" /> {t('userLayout.myOrders')}
            </NavLink>
            <NavLink className="nav-link" to="/cart">
              <i className="bi bi-cart3 me-2" /> {t('userLayout.cart')}
            </NavLink>
            <NavLink className="nav-link" to="/profile">
              <i className="bi bi-person-circle me-2" /> {t('userLayout.profile')}
            </NavLink>
          </nav>
        </div>
        <div className="col-md-10 py-4">{children ?? <Outlet />}</div>
      </div>
    </div>
  )
}
