import React, { Suspense } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './scss/style.scss'

// --- LOAD YOUR CUSTOM STYLES ---
import './styles/Admin.css'
import './styles/SalesPage.css'
import './styles/InventoryPage.css'
import './styles/ProductPage.css'
import './styles/ReportsPage.css'
import './styles/SettingsPage.css'
import './styles/DeliveryPortal.css'
import './styles/LandingPage.css'
import './styles/Products.css'
import './styles/OrdersPage.css'
import './styles/App.css' // Login/Recovery styles

const loading = (
  <div className="pt-3 text-center">
    <div className="sk-spinner sk-spinner-pulse"></div>
  </div>
)

// --- CONTAINERS ---
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// --- ADMIN PAGES (Standalone) ---
const Login = React.lazy(() => import('./views/pages/login/Login')) 
const Recovery = React.lazy(() => import('./views/pages/RecoveryPage'))
const DeliveryPortal = React.lazy(() => import('./views/admin/DeliveryPortal'))

// --- CLIENT PAGES (Public Website) ---
const LandingPage = React.lazy(() => import('./views/client/LandingPage'))
const Products = React.lazy(() => import('./views/client/Products'))
const ProductDetails = React.lazy(() => import('./views/client/ProductDetails'))
const OrderStatus = React.lazy(() => import('./views/client/OrderStatus'))
const ContactUs = React.lazy(() => import('./views/client/ContactUs'))

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={loading}>
        <Routes>
          {/* --- ADMIN AUTH ROUTES --- */}
          <Route exact path="/admin/login" element={<Login />} />
          <Route exact path="/admin/recover-password" element={<Recovery />} />
          
          {/* --- DRIVER PORTAL (Standalone) --- */}
          <Route exact path="/admin/delivery" element={<DeliveryPortal />} />

          {/* --- CLIENT ROUTES (Public) --- */}
          <Route exact path="/home" element={<LandingPage />} />
          <Route exact path="/products" element={<Products />} />
          <Route exact path="/products/:name" element={<ProductDetails />} />
          <Route exact path="/order-status" element={<OrderStatus />} />
          <Route exact path="/contact-us" element={<ContactUs />} />
          
          {/* Redirect root to public products page */}
          <Route exact path="/" element={<Navigate to="/products" replace />} />

          {/* --- ADMIN DASHBOARD (Catch-all) --- */}
          <Route path="*" element={<DefaultLayout />} />
          
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App