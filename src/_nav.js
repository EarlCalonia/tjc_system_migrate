import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilCart,
  cilList,
  cilTruck,
  cilPeople,
  cilGraph,
  cilSettings,
  cilBasket,
  cilHistory // [NEW] Import History Icon
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  // --- DASHBOARD (Primary Entry) ---
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  // --- OPERATIONS ---
  {
    component: CNavTitle,
    name: 'Operations',
  },
  {
    component: CNavItem,
    name: 'Sales',
    to: '/sales',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Orders',
    to: '/orders',
    icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  },
  // --- INVENTORY ---
  {
    component: CNavTitle,
    name: 'Inventory',
  },
  {
    component: CNavItem,
    name: 'Stock View',
    to: '/inventory',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Products',
    to: '/product-management',
    icon: <CIcon icon={cilBasket} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Suppliers',
    to: '/suppliers',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  // --- ANALYSIS ---
  {
    component: CNavTitle,
    name: 'Analysis',
  },
  {
    component: CNavItem,
    name: 'Reports',
    to: '/reports',
    icon: <CIcon icon={cilGraph} customClassName="nav-icon" />,
  },
  // --- SYSTEM ---
  {
    component: CNavTitle,
    name: 'System',
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
  // [NEW] Activity Logs Link
  {
    component: CNavItem,
    name: 'Activity Logs',
    to: '/activity-logs',
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  },
]

export default _nav