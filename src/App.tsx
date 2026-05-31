import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"

import Layout from "./shared/components/Layout"
import CollectionView from "./features/records/views/CollectionView"
import FavoritesView from "./features/records/views/FavoritesView"
import WishlistView from "./features/records/views/WishlistView"
import LoginView from "./features/auth/views/LoginView"
import SignupView from "./features/auth/views/SignupView"

import { useAuthStore } from "./features/auth/store/authStore"
import { useRecordsStore } from "./features/records/store/recordsStore"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PersistentViews() {
  const location = useLocation()
  const setSelectedRecord = useRecordsStore((state) => state.setSelectedRecord)

  useEffect(() => {
    setSelectedRecord(null)
  }, [location.pathname])

  return (
    <>
      <div style={{ display: location.pathname === "/collection" ? "flex" : "none", flex: 1, minHeight: 0 }}>
        <CollectionView />
      </div>
      <div style={{ display: location.pathname === "/favorites" ? "flex" : "none", flex: 1, minHeight: 0 }}>
        <FavoritesView />
      </div>
      <div style={{ display: location.pathname === "/wishlist" ? "flex" : "none", flex: 1, minHeight: 0 }}>
        <WishlistView />
      </div>
    </>
  )
}

export default function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const fetchRecords = useRecordsStore((state) => state.fetchRecords)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) fetchRecords()
  }, [user])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/signup" element={<SignupView />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <PersistentViews />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}