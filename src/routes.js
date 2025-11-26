import React from 'react'

// Import your migrated Admin Views
const Dashboard = React.lazy(() => import('./views/admin/DashboardPage'))
const Sales = React.lazy(() => import('./views/admin/SalesPage'))
const Inventory = React.lazy(() => import('./views/admin/InventoryPage'))
const Suppliers = React.lazy(() => import('./views/admin/SuppliersPage'))
const Orders = React.lazy(() => import('./views/admin/OrdersPage'))
const Reports = React.lazy(() => import('./views/admin/ReportsPage'))
const Settings = React.lazy(() => import('./views/admin/SettingsPage'))
const ProductMgmt = React.lazy(() => import('./views/admin/ProductPage'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/sales', name: 'Sales', element: Sales },
  { path: '/inventory', name: 'Inventory', element: Inventory },
  { path: '/product-management', name: 'Products', element: ProductMgmt },
  { path: '/suppliers', name: 'Suppliers', element: Suppliers },
  { path: '/orders', name: 'Orders', element: Orders },
  { path: '/reports', name: 'Reports', element: Reports },
  { path: '/settings', name: 'Settings', element: Settings },
  // --- NEW: Profile route linking to the Settings Page ---
  { path: '/profile', name: 'My Profile', element: Settings },
]

export default routes