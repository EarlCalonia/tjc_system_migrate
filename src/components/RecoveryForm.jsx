import React from 'react';
import { Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CInputGroup, CInputGroupText, CFormInput, CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilEnvelopeClosed } from '@coreui/icons';
import tcjLogo from '../assets/tcj_logo.png';

const RecoveryForm = () => {
  return (
    <CCard className="p-4 bg-white border-0 shadow-lg" style={{ borderRadius: '12px' }}>
      <CCardBody>
        <CForm>
          {/* Logo Area */}
          <div className="text-center mb-4">
            <img 
              src={tcjLogo} 
              alt="TJC Logo" 
              style={{ height: '70px', objectFit: 'contain' }} 
            />
          </div>

          <div className="text-center mb-4">
            <h2 className="login-title">Reset Password</h2>
            <p className="text-medium-emphasis small">
              Enter your email address and we'll send you a link to reset your credentials.
            </p>
          </div>
          
          {/* Email Input - Industrial Square Box Design */}
          <CInputGroup className="mb-4 custom-input-group">
            <CInputGroupText className="login-input-icon">
              <CIcon icon={cilEnvelopeClosed} />
            </CInputGroupText>
            <CFormInput 
              type="email" 
              placeholder="Enter your registered email" 
              className="login-input"
              required 
            />
          </CInputGroup>
          
          <div className="d-grid gap-2 mb-3">
            <CButton className="login-btn">
              Send Reset Link
            </CButton>
          </div>

          <div className="text-center mt-3">
            <Link 
              to="/admin/login" 
              className="text-decoration-none fw-bold small"
              style={{ color: '#17334e', letterSpacing: '0.5px' }}
            >
              <i className="fas fa-arrow-left me-2"></i> Back to Login
            </Link>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  );
};

export default RecoveryForm;