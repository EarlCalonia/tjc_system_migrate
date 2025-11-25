import React from 'react';
import { Link } from 'react-router-dom';
import tcjLogo from '../../assets/tcj_logo.png';

const Navbar = () => {
  return (
    <nav className="landing-nav">
      <div className="nav-left">
        <img src={tcjLogo} alt="TJC Auto Supply Logo" className="logo" />
      </div>
      <div className="nav-right">
        <Link to="/products" className="nav-link">Products</Link>
        <Link to="/order-status" className="nav-link">Order Status</Link>
        <Link to="/contact-us" className="nav-link">Contact us</Link>
      </div>
    </nav>
  );
};

export default Navbar;