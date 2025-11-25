import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import Navbar from '../../components/client/Navbar';
import Footer from '../../components/client/Footer';
import '../../styles/Products.css';
import { productAPI } from '../../utils/api';

const currency = (n) => `₱ ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ProductDetails = () => {
  const { state } = useLocation();
  const { name } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        let fetchedProduct = null;

        // 1. Try to get product by ID passed via navigation state
        if (state?.productId) {
          const res = await productAPI.getProductById(state.productId);
          fetchedProduct = res.data;
        } 
        // 2. Fallback: If page was refreshed, try to find by name search
        else if (name) {
             const decodedName = decodeURIComponent(name).replace(/-/g, ' ');
             const res = await productAPI.getProducts({ search: decodedName });
             if (res.data?.products?.length > 0) {
                // Best effort match
                fetchedProduct = res.data.products[0];
             }
        }

        if (fetchedProduct) {
          setProduct(fetchedProduct);
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [state, name]);

  if (loading) return (
    <div className="products-page">
      <Navbar />
      <div style={{padding: '80px', textAlign: 'center', minHeight: '50vh'}}>
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 text-muted">Loading details...</p>
      </div>
      <Footer />
    </div>
  );

  if (error || !product) return (
    <div className="products-page">
      <Navbar />
      <div style={{padding: '80px', textAlign: 'center', minHeight: '50vh'}}>
        <h3 className="text-secondary">{error || 'Product not found'}</h3>
        <Link to="/products" className="btn btn-primary mt-3">Back to Catalog</Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="products-page">
      <Navbar />
      <main className="products-main" style={{ paddingBottom: '60px', backgroundColor: '#f8f9fa' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '20px' }}>
           <Link to="/products" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#6c757d', fontWeight: '500' }}>
             &larr; Back to Products
           </Link>

           <div className="product-detail-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              
              {/* Left: Image */}
              <div className="detail-image-container" style={{ background: '#fff', border: '1px solid #edf2f7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', height: '400px' }}>
                  <img 
                    src={product.image ? (product.image.startsWith('http') ? product.image : `http://localhost:5000${product.image}`) : 'https://placehold.co/600x450?text=No+Image'} 
                    alt={product.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
              </div>

              {/* Right: Info */}
              <div className="detail-info">
                  <span className="product-brand" style={{ color: '#2478bd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>{product.brand}</span>
                  <h1 className="product-title" style={{ fontSize: '2.2rem', fontWeight: '800', margin: '10px 0 20px', color: '#1a202c', lineHeight: '1.2' }}>{product.name}</h1>
                  
                  <div className="badges mb-4" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '600' }}>{product.category}</span>
                      <span style={{ background: product.stock > 0 ? '#d1fae5' : '#fee2e2', color: product.stock > 0 ? '#065f46' : '#991b1b', padding: '6px 16px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}
                      </span>
                  </div>

                  <div className="price-section mb-4" style={{ borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2478bd' }}>{currency(product.price)}</span>
                  </div>

                  <div className="description-section mb-4">
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '10px', color: '#2d3748' }}>Description</h4>
                    <p style={{ color: '#4a5568', lineHeight: '1.7', fontSize: '1rem' }}>{product.description || 'No description available for this product.'}</p>
                  </div>

                  {product.vehicle_compatibility && (
                    <div className="compatibility-section" style={{ background: '#f7fafc', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #2478bd' }}>
                       <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#2d3748' }}>
                         <span>🚗</span> Vehicle Compatibility
                       </h4>
                       <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>{product.vehicle_compatibility}</p>
                    </div>
                  )}
              </div>
           </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetails;