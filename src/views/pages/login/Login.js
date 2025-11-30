import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { authAPI } from '../../../utils/api'

// Assets and Styles
import tcjLogo from '../../../assets/tcj_logo.png' 
import loginBg from '../../../assets/images/login-bg.png' 
import '../../../styles/Login.css' 

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await authAPI.login(email, password)
      const user = result.data

      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', user.id)
      localStorage.setItem('username', user.username)
      
      if (user.avatar) {
        localStorage.setItem('avatar', user.avatar)
      } else {
        localStorage.removeItem('avatar')
      }

      if (user.role === 'driver') {
        navigate('/admin/delivery')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="login-wrapper"
      style={{ backgroundImage: `linear-gradient(rgba(23, 51, 78, 0.85), rgba(23, 51, 78, 0.9)), url(${loginBg})` }}
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup className="login-card-group">
              
              {/* --- LEFT CARD: LOGIN FORM --- */}
              <CCard className="p-4 bg-white border-0">
                <CCardBody>
                  <CForm onSubmit={handleLogin}>
                    
                    {/* [SMART FIX] 
                       Only show this logo on Mobile (d-md-none). 
                       On Desktop, we hide it because it's displayed prominently on the right card.
                    */}
                    <div className="text-center mb-4 d-md-none">
                      <img 
                        src={tcjLogo} 
                        alt="TJC Logo" 
                        style={{ height: '60px', objectFit: 'contain' }} 
                      />
                    </div>

                    <h2 className="login-title">Admin Login</h2>
                    <p className="text-medium-emphasis mb-4">Sign in to access the system</p>
                    
                    {error && <CAlert color="danger" className="py-2 small">{error}</CAlert>}

                    <CInputGroup className="mb-3">
                      <CInputGroupText className="login-input-icon">
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput 
                        placeholder="Email Address" 
                        autoComplete="email" 
                        className="login-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </CInputGroup>
                    
                    <CInputGroup className="mb-4">
                      <CInputGroupText className="login-input-icon">
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </CInputGroup>
                    
                    <CRow>
                      <CCol xs={6}>
                        <CButton 
                          className="login-btn px-4 w-100" 
                          type="submit" 
                          disabled={loading}
                        >
                          {loading ? '...' : 'LOGIN'}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-end d-flex align-items-center justify-content-end">
                        <Link 
                          to="/admin/recover-password" 
                          className="text-decoration-none small fw-semibold"
                          style={{ color: '#2478bd' }}
                        >
                          Forgot password?
                        </Link>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
              
              {/* --- RIGHT CARD: BRAND WELCOME --- */}
              <CCard className="text-white py-5 border-0 d-none d-md-flex brand-card">
                <CCardBody className="text-center d-flex align-items-center justify-content-center">
                  <div>
                    {/* [NEW] Logo Placement for Desktop */}
                    <div className="mb-4">
                      <img 
                        src={tcjLogo} 
                        alt="TJC Logo" 
                        style={{ 
                          height: '100px', 
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' // Adds subtle depth
                        }} 
                      />
                    </div>

                    <h2 className="brand-title">TJC AUTO SUPPLY</h2>
                    <p className="mb-0 fw-semibold fs-5">
                      Sales & Inventory Management System
                    </p>
                    <hr className="brand-divider" />
                    <p className="small opacity-75 fw-bold">
                      AUTHORIZED PERSONNEL ONLY
                    </p>
                  </div>
                </CCardBody>
              </CCard>

            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login