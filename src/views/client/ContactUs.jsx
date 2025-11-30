import React from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import CIcon from '@coreui/icons-react';
import { 
  cilLocationPin, 
  cilPhone, 
  cilEnvelopeClosed, 
  cilClock 
} from '@coreui/icons';
import bg from '../../assets/image-background.png'; 
import '../../styles/ContactUs.css';

const ContactUs = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for reaching out! Our sales team will contact you shortly.");
  };

  return (
    <div className="contact-page">
      <Navbar />
      
      {/* Hero Section */}
      <header 
        className="contact-hero"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="hero-content">
          <h1>Get in Touch</h1>
          <p>Need parts availability, pricing, or bulk orders? We're here to help.</p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="contact-container">
        
        {/* Left Side: Contact Info */}
        <aside className="info-sidebar">
          <div className="info-card">
            <h3>Contact Info</h3>
            
            <div className="info-item">
              <div className="icon-box">
                {/* [FIX] Replaced FontAwesome with CoreUI Location Icon */}
                <CIcon icon={cilLocationPin} height={20} />
              </div>
              <div className="info-text">
                <h4>Visit Our Store</h4>
                <p>Gen Hizon Ext, Santa Lucia</p>
                <p>City of San Fernando, Pampanga</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="icon-box">
                {/* [FIX] Replaced FontAwesome with CoreUI Phone Icon */}
                <CIcon icon={cilPhone} height={20} />
              </div>
              <div className="info-text">
                <h4>Call Us</h4>
                <p>0912 345 6789</p>
                <p>(045) 123-4567</p>
              </div>
            </div>

            <div className="info-item">
              <div className="icon-box">
                {/* [FIX] Replaced FontAwesome with CoreUI Envelope Icon */}
                <CIcon icon={cilEnvelopeClosed} height={20} />
              </div>
              <div className="info-text">
                <h4>Email Us</h4>
                <p>tjcautosupply@gmail.com</p>
                <p>sales@tjcautosupply.com</p>
              </div>
            </div>

             <div className="info-item">
              <div className="icon-box">
                {/* [FIX] Replaced FontAwesome with CoreUI Clock Icon */}
                <CIcon icon={cilClock} height={20} />
              </div>
              <div className="info-text">
                <h4>Business Hours</h4>
                <p>Mon - Sat: 8:00 AM - 5:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Message Form */}
        <main className="contact-form-wrapper">
          <div className="form-header">
            <h2>Send us a Message</h2>
            <p>Fill out the form below and our team will respond within 24 hours.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" placeholder="Enter your name" required />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" placeholder="Enter your email" required />
            </div>

            <div className="form-group">
              <label>Subject</label>
              <select className="form-control">
                <option>Product Inquiry & Availability</option>
                <option>Order Status Update</option>
                <option>Returns & Warranty</option>
                <option>Bulk / Wholesale Order</option>
                <option>Other Concern</option>
              </select>
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea className="form-control" placeholder="How can we help you today?" required></textarea>
            </div>

            <button type="submit" className="submit-btn">Send Message</button>
          </form>
        </main>
      </div>

      {/* Google Map Embed */}
      <section className="map-section">
        <iframe 
          title="TJC Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3851.689771749253!2d120.691667!3d15.021667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTXCsDAxJzE4LjAiTiAxMjDCsDQxJzMwLjAiRQ!5e0!3m2!1sen!2sph!4v1600000000000!5m2!1sen!2sph" 
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade">
        </iframe>
      </section>

      <Footer />
    </div>
  );
};

export default ContactUs;