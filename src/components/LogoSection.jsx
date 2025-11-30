import React from 'react';
import logo from '../assets/login_logo.png'; // Using the existing asset

const LogoSection = () => {
  return (
    <div className="text-center mb-4">
      {/* Adjust width/height as needed to match your design */}
      <img 
        src={logo} 
        alt="TJC System Logo" 
        style={{ maxWidth: '100%', height: 'auto', maxHeight: '100px' }} 
      />
    </div>
  );
};

export default LogoSection;