import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import ProductDetails from './pages/ProductDetails'
import BuyNow from './pages/BuyNow'
import HowToBuy from './pages/HowToBuy'

import UserLayout from './pages/user/UserLayout'
import MyOrders from './pages/user/MyOrders'
import Cart from './pages/user/Cart'
import CartCheckout from './pages/user/CartCheckout'
import Profile from './pages/user/Profile'

import AdminLayout from './pages/admin/AdminLayout'
import NewProduct from './pages/admin/NewProduct'
import ViewProducts from './pages/admin/ViewProducts'
import ViewOrders from './pages/admin/ViewOrders'
import ViewUsers from './pages/admin/ViewUsers'

function HomeRoute() {
  const { isAuthenticated, isAdmin } = useAuth()
  if (isAuthenticated && !isAdmin) {
    return (
      <UserLayout>
        <Home />
      </UserLayout>
    )
  }
  return <Home />
}

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products/:productId" element={<ProductDetails />} />
        <Route path="/how-to-buy/:productId" element={<HowToBuy />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/buy/:productId" element={<BuyNow />} />
          <Route element={<UserLayout />}>
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/cart/checkout" element={<CartCheckout />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/products/new" element={<NewProduct />} />
            <Route path="/admin/products" element={<ViewProducts />} />
            <Route path="/admin/orders" element={<ViewOrders />} />
            <Route path="/admin/users" element={<ViewUsers />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}

export default App
