import React from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';
import RecoveryForm from '../../components/RecoveryForm';
import loginBg from '../../assets/images/login-bg.png';
// We reuse Login.css because it contains all the "Auth" styles (inputs, buttons, backgrounds)
import '../../styles/Login.css'; 

const RecoveryPage = () => {
  return (
    <div 
      className="login-wrapper"
      style={{ backgroundImage: `linear-gradient(rgba(23, 51, 78, 0.85), rgba(23, 51, 78, 0.9)), url(${loginBg})` }}
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} lg={5}>
            {/* The form component now handles its own Card structure */}
            <RecoveryForm />
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default RecoveryPage;