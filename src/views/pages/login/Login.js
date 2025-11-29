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
import tcjLogo from '../../../assets/tcj_logo.png' // Import your logo

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
    // bg-light ensures a clean, neutral background for the whole page
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup className="shadow-lg"> {/* Added Shadow for depth */}
              
              {/* --- LEFT CARD: LOGIN FORM --- */}
              <CCard className="p-4 bg-white border-0">
                <CCardBody>
                  <CForm onSubmit={handleLogin}>
                    
                    {/* BRANDING: Logo Area */}
                    <div className="text-center mb-4">
                      <img 
                        src={tcjLogo} 
                        alt="TJC Logo" 
                        style={{ height: '60px', objectFit: 'contain' }} 
                      />
                    </div>

                    <h2 className="text-body-secondary">Login</h2>
                    <p className="text-medium-emphasis mb-4">Sign In to your account</p>
                    
                    {error && <CAlert color="danger" className="py-2 small">{error}</CAlert>}

                    <CInputGroup className="mb-3">
                      <CInputGroupText className="bg-light border-end-0">
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput 
                        placeholder="Email Address" 
                        autoComplete="email" 
                        className="border-start-0"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </CInputGroup>
                    
                    <CInputGroup className="mb-4">
                      <CInputGroupText className="bg-light border-end-0">
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        className="border-start-0"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </CInputGroup>
                    
                    <CRow>
                      <CCol xs={6}>
                        {/* Primary Color Button (Uses #2478bd defined in style.scss) */}
                        <CButton color="primary" className="px-4 text-white" type="submit" disabled={loading}>
                          {loading ? 'Logging in...' : 'Login'}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-end">
                        {/* Accessible Link Color */}
                        <Link to="/admin/recover-password" className="text-decoration-none text-brand-blue small">
                          Forgot password?
                        </Link>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
              
              {/* --- RIGHT CARD: BRAND WELCOME --- */}
              {/* bg-primary will now automatically use your TJC Blue (#2478bd) */}
              <CCard className="text-white bg-primary py-5 border-0" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex align-items-center justify-content-center">
                  <div>
                    <h2 className="fw-bold mb-3">TJC Auto Supply</h2>
                    <p className="mb-0">
                      Sales and Inventory Management System
                    </p>
                    <hr className="opacity-25 my-4 mx-auto" style={{width: '50%'}} />
                    <p className="small opacity-75">
                      Secure access for authorized personnel only.
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