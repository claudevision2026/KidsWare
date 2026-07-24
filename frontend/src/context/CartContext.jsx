import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [itemCount, setItemCount] = useState(0)

  const refreshCartCount = useCallback(async () => {
    if (!isAuthenticated) {
      setItemCount(0)
      return
    }
    try {
      const res = await apiClient.get('/cart')
      const count = res.data.items.reduce((sum, i) => sum + i.quantity, 0)
      setItemCount(count)
    } catch {
      setItemCount(0)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refreshCartCount()
  }, [refreshCartCount])

  const value = {
    itemCount,
    refreshCartCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
