import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { 
  CSidebar, 
  CSidebarBrand, 
  CSidebarToggler, 
  CAvatar, 
  CModal, 
  CModalHeader, 
  CModalTitle, 
  CModalBody, 
  CModalFooter, 
  CButton 
} from '@coreui/react'
import { AppSidebarNav } from './AppSidebarNav'
import navigation from '../_nav'
import { useNavigate } from 'react-router-dom'
import { authAPI, usersAPI } from '../utils/api' // [UPDATED] Imported usersAPI

// Icons
import CIcon from '@coreui/icons-react'
import { cilAccountLogout, cilUser, cilWarning } from '@coreui/icons'

// Branding Assets
import sidebarIcon from '../assets/sidebar-icon.png' 

const ASSET_URL = 'http://localhost:5000'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  // User State
  const [avatar, setAvatar] = useState(null)
  const [username, setUsername] = useState('User')
  const [role, setRole] = useState('Staff')
  
  // Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // [FIX] Sync Session with Database on Mount
  useEffect(() => {
    const syncSession = async () => {
        const userId = localStorage.getItem('userId');
        if (userId) {
            try {
                // Fetch fresh user data from DB
                const res = await usersAPI.getById(userId);
                if (res.success && res.data) {
                    const freshUser = res.data;
                    
                    // Update LocalStorage with fresh DB data
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    localStorage.setItem('role', freshUser.role);
                    localStorage.setItem('userRole', freshUser.role);
                    localStorage.setItem('username', freshUser.username);
                    
                    if (freshUser.avatar) {
                        localStorage.setItem('userAvatar', freshUser.avatar);
                    }

                    // Force update local state immediately
                    setUsername(freshUser.username);
                    setRole(freshUser.role);
                    if (freshUser.avatar) {
                       setAvatar(freshUser.avatar.startsWith('http') ? freshUser.avatar : `${ASSET_URL}${freshUser.avatar}`)
                    }
                    
                    // Notify other components
                    window.dispatchEvent(new Event('userUpdated'));
                }
            } catch (error) {
                console.error("Session sync failed", error);
            }
        }
    };

    syncSession();
  }, []);

  useEffect(() => {
    const loadUser = () => {
       const storedAvatar = localStorage.getItem('userAvatar')
       const storedName = localStorage.getItem('username')
       const storedRole = localStorage.getItem('role') || localStorage.getItem('userRole') // [FIX] Check both keys

       if (storedAvatar) {
           setAvatar(storedAvatar.startsWith('http') ? storedAvatar : `${ASSET_URL}${storedAvatar}`)
       }
       if (storedName) setUsername(storedName)
       if (storedRole) setRole(storedRole)
    }
    loadUser()
    window.addEventListener('userUpdated', loadUser)
    return () => window.removeEventListener('userUpdated', loadUser)
  }, [])

  // 1. Open the Modal
  const handleLogoutClick = (e) => {
    e.preventDefault()
    setShowLogoutModal(true)
  }

  // 2. Perform Logout
  const confirmLogout = async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      console.error("Logout failed", e)
    } finally {
      localStorage.clear()
      // Force redirect to admin login
      window.location.href = '/admin/login'
    }
  }

  return (
    <>
      <CSidebar
        position="fixed"
        unfoldable={unfoldable}
        visible={sidebarShow}
        onVisibleChange={(visible) => {
          dispatch({ type: 'set', sidebarShow: visible })
        }}
        className="sidebar-brand-navy border-end d-flex flex-column" 
      >
        <CSidebarBrand className="d-none d-md-flex flex-column align-items-center justify-content-center" to="/">
          {/* --- FULL LOGO --- */}
          <div className="d-flex flex-column align-items-center py-4 sidebar-brand-full">
              <img 
                  src={sidebarIcon} 
                  alt="TJC Logo" 
                  className="mb-3" 
                  style={{
                    height: '55px', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' 
                  }} 
              />
              <div style={{
                  fontFamily: "'Oswald', sans-serif", 
                  color: '#f1ce44', 
                  fontSize: '15px', 
                  letterSpacing: '1.5px',
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
              }}>
                  TJC AUTO SUPPLY
              </div>
              <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '10px',
                  letterSpacing: '1px',
                  marginTop: '2px',
                  textTransform: 'uppercase'
              }}>
                  Admin Portal
              </div>
          </div>
          
          {/* --- NARROW LOGO (When minimized) --- */}
          <img 
            className="sidebar-brand-narrow" 
            src={sidebarIcon} 
            alt="Icon" 
            style={{ height: '35px', objectFit: 'contain', margin: '10px 0' }} 
          />
        </CSidebarBrand>
        
        {/* Navigation */}
        <AppSidebarNav items={navigation} />

        {/* --- USER FOOTER SECTION --- */}
        <div className="mt-auto border-top border-white border-opacity-10 p-3">
            <div className={`d-flex align-items-center ${unfoldable ? 'justify-content-center' : 'justify-content-between'}`}>
                
                {/* Profile Info (Hide if narrow) */}
                {!unfoldable && (
                    <div className="d-flex align-items-center overflow-hidden" style={{cursor: 'pointer'}} onClick={() => navigate('/profile')}>
                        <CAvatar src={avatar || undefined} color={!avatar ? "secondary" : undefined} size="md" status="success">
                            {!avatar && <CIcon icon={cilUser} />}
                        </CAvatar>
                        <div className="ms-2 d-flex flex-column" style={{lineHeight: '1.2'}}>
                            <span className="fw-bold text-white small text-truncate" style={{maxWidth: '120px'}}>{username}</span>
                            <span className="text-white-50" style={{fontSize: '10px'}}>{role}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="d-flex gap-2">
                    {/* LOGOUT BUTTON - Triggers Modal */}
                    <button 
                      className="btn btn-sm btn-ghost-danger text-danger" 
                      onClick={handleLogoutClick} 
                      title="Logout"
                    >
                      <CIcon icon={cilAccountLogout} />
                    </button>
                </div>
            </div>
        </div>

        <CSidebarToggler
          className="d-none d-lg-flex"
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebar>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      <CModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-bold text-brand-navy">Confirm Logout</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex align-items-center">
          <div className="bg-light p-3 rounded-circle me-3">
             <CIcon icon={cilWarning} size="xl" className="text-warning"/>
          </div>
          <div>
             <h6 className="mb-1">Are you sure you want to log out?</h6>
             <div className="text-muted small">You will be returned to the login screen.</div>
          </div>
        </CModalBody>
        <CModalFooter className="border-top-0">
          <CButton color="secondary" variant="ghost" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white px-4" onClick={confirmLogout}>
            Logout
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default React.memo(AppSidebar)