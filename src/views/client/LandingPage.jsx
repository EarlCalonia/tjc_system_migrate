import React from 'react';
import { Link } from 'react-router-dom';
import tcjLogo from '../../assets/tcj_logo.png';
import '../../styles/LandingPage.css';
import browseProducts from '../../assets/browseProducts.png';
import checkOrder from '../../assets/checkOrder.png';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="landing-main">
        <div className="welcome-section">
          <h1>WELCOME TO TJC AUTO SUPPLY</h1>
          <p>Browse products and check your order status</p>
        </div>

        <div className="info-banner">
          <p>For processing orders, please visit our physical store.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-container">
              <img src={browseProducts} alt="Browse Products icon" className="feature-icon" />
            </div>
            <h3>Browse Products</h3>
            <br></br>
            <p>View our complete catalog of auto parts with current stock levels</p>
            <Link to="/products" className="feature-btn">View Products</Link>
          </div>

          <div className="feature-card">
            <div className="icon-container">
              <img src={checkOrder} alt="Check Order icon" className="feature-icon" />
            </div>
            <h3>Check Order Status</h3>
            <p>Track your order progress using your reference number</p>
            <Link to="/order-status" className="feature-btn">Check Status</Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;