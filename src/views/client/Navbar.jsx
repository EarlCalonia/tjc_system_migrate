import React from 'react';
import { Link, useLocation } from 'react-router-dom'; 
import tcjLogo from '../../assets/tcj_logo.png';
import '../../styles/Navbar.css'; // <--- THIS WAS MISSING. IT LOADS THE NEW STYLE.

const Navbar = () => {
  const location = useLocation();
  
  // Helper to check active state
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/products') return 'active';
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="landing-nav">
      <div className="nav-left">
        {/* Logo acts as Home button */}
        <Link to="/">
          <img src={tcjLogo} alt="TJC Auto Supply Logo" className="logo" />
        </Link>
      </div>
      <div className="nav-right">
        <Link to="/products" className={`nav-link ${isActive('/products')}`}>Products</Link>
        <Link to="/order-status" className={`nav-link ${isActive('/order-status')}`}>Order Status</Link>
        <Link to="/contact-us" className={`nav-link ${isActive('/contact-us')}`}>Contact us</Link>
      </div>
    </nav>
  );
};

export default Navbar;