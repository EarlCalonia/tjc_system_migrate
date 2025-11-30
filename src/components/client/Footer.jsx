import React from 'react';
import '../../styles/Footer.css'; // <--- THIS WAS MISSING.

const Footer = () => {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Store Location</h4>
          <p>Gen Hizon Ext, Santa Lucia</p>
          <p>City of San Fernando, Pampanga</p>
        </div>
        
        <div className="footer-section">
          <h4>Contact Information</h4>
          <p>Phone: 0912 345 6789</p>
          <p>Email: tjcautosupply@gmail.com</p>
        </div>
        
        <div className="footer-section">
          <h4>Business Hours</h4>
          <p>Monday - Saturday: 8:00 AM - 5:00 PM</p>
          <p>Sunday: Closed</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 TJC Auto Supply. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;