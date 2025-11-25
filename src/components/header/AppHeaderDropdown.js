import React from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilLockLocked,
  cilSettings,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../../utils/api' // Ensure this path points to your api.js

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'Admin'
  const avatarPath = localStorage.getItem('avatar')
  
  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error', error)
    }
    // Clear local storage
    localStorage.setItem('isAuthenticated', 'false')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('avatar')
    
    // Redirect to login
    navigate('/admin/login')
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
        {/* Show User Avatar or Default Initials */}
        {avatarPath ? (
           <img 
             src={`http://localhost:5000${avatarPath}`} 
             alt="user" 
             style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} 
           />
        ) : (
           <CAvatar color="secondary" size="md" className="text-white">{username.charAt(0).toUpperCase()}</CAvatar>
        )}
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-light fw-semibold py-2">Account</CDropdownHeader>
        <CDropdownItem href="#/settings">
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem href="#/settings">
          <CIcon icon={cilSettings} className="me-2" />
          Settings
        </CDropdownItem>
        <CDropdownDivider />
        {/* LOGOUT ACTION */}
        <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown