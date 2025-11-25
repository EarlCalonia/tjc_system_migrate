import React from 'react';

const Footer = () => {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Store Location</h4>
          <p>General Hizon Avenue,</p>
          <p>Santa Lucia, City of San Fernando, Pampanga</p>
        </div>
        
        <div className="footer-section">
          <h4>Contact Information</h4>
          <p>Phone: 0912 345 6789</p>
          <p>Email: tjcautosupply@gmail.com</p>
        </div>
        
        <div className="footer-section">
          <h4>Business Hours</h4>
          <p>Monday - Saturday: 8:00 AM - 6:00 PM</p>
          <p>Sunday: Closed</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>©2025 TJC Auto Supply. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;