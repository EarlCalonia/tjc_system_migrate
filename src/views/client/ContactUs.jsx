import React from 'react';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import bg from '../../assets/123.jpg';

const ContactUs = () => {
  return (
    <div className="contact-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main
        style={{
          flex: '1 0 auto',
          width: '100%',
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <Footer />
    </div>
  );
};

export default ContactUs;