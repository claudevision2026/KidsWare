import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const { isAuthenticated, isAdmin, phoneNumber, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-ktw px-3 py-2">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <Logo size={40} />
          <span className="fs-4">Kids Trendy Ware</span>
        </Link>
        <div className="d-flex align-items-center gap-3">
          <LanguageSwitcher />
          {isAdmin && (
            <Link className="nav-link" to="/admin/products/new">
              {t('nav.admin')}
            </Link>
          )}
          {isAuthenticated && !isAdmin && (
            <Link className="nav-link" to="/my-orders">
              {t('nav.myOrders')}
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <span className="text-white small">{t('nav.greeting', { phone: phoneNumber })}</span>
              <button className="btn btn-light btn-sm" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-light btn-sm" to="/login">
                {t('nav.login')}
              </Link>
              <Link className="btn btn-outline-light btn-sm" to="/register">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
