import React from 'react';
import { Link } from 'react-router-dom';
// Adjusted paths with ../../ to step out of "views/pages/"
import '../../styles/App.css';
import LogoSection from '../../components/LogoSection';
import RecoveryForm from '../../components/RecoveryForm';

const RecoveryPage = () => (
  <div className="app-bg">
    <div className="container-fluid h-100">
      <div className="row h-100 align-items-center justify-content-center">
        <div className="col-lg-6 col-md-5 d-flex justify-content-center align-items-center logo-col">
          <LogoSection />
        </div>
        <div className="col-lg-4 col-md-6 col-sm-10 d-flex justify-content-center align-items-center">
          <RecoveryForm />
        </div>
      </div>
    </div>
  </div>
);

export default RecoveryPage;