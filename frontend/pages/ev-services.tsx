import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Navigation, CheckCircle, Clock, ShieldCheck, Sparkles, ShoppingCart, QrCode } from 'lucide-react';
import Layout from '@/components/Layout';

interface User {
  name: string;
}

interface Station {
  id: string;
  name: string;
  locationName: string;
}

const PREDEFINED_STATIONS: Station[] = [
  { id: 'station-velachery', name: 'Power2Go – Velachery', locationName: 'Phoenix Marketcity, Velachery, Chennai' },
  { id: 'station-sholinganallur', name: 'Power2Go – Sholinganallur', locationName: 'OMR IT Corridor, Sholinganallur, Chennai' },
  { id: 'station-mattuthavani', name: 'Power2Go – Mattuthavani', locationName: 'Mattuthavani Bus Stand Road, Madurai' },
  { id: 'station-trichy', name: 'Power2Go – Trichy Central', locationName: 'Central Bus Stand, Trichy' },
  { id: 'station-karur', name: 'Power2Go – Karur Bus Stand', locationName: 'Karur Bus Stand, Karur' }
];

export default function EVServices() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // States
  const [selectedStation, setSelectedStation] = useState<Station>(PREDEFINED_STATIONS[4]); // default to Karur
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [washType, setWashType] = useState<'basic' | 'premium' | 'eco'>('basic');
  const [selectedAccessories, setSelectedAccessories] = useState<any[]>([]);
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'online' | 'offline'>('online');
  const [loading, setLoading] = useState(false);

  // UPI States
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [upiStep, setUpiStep] = useState<'select' | 'processing' | 'success'>('select');

  const ACCESSORIES_LIST = [
    { id: 'cable', name: '🔌 Heavy Duty Charging Cable', price: 1299 },
    { id: 'adapter', name: '🔌 Universal Adapter Plug', price: 499 },
    { id: 'care_kit', name: '🧼 Car Care Cleaning Kit', price: 349 },
    { id: 'holder', name: '📱 Anti-Slip Phone Holder', price: 199 },
    { id: 'compressor', name: '💨 Portable Air Compressor', price: 1499 }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }

    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services');
        if (res.ok) {
          const data = await res.json();
          setDbServices(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchServices();
  }, [router]);

  const getServicesTotal = () => {
    let sum = 0;
    selectedServices.forEach(s => {
      if (s.service_key === 'car_wash') {
        sum += washType === 'basic' ? 299 : washType === 'premium' ? 599 : 399;
      } else if (s.service_key === 'ev_accessories') {
        sum += selectedAccessories.reduce((acc, curr) => acc + curr.price, 0);
      } else {
        sum += s.price;
      }
    });
    return sum;
  };

  const totalAmount = getServicesTotal();

  const handleBooking = async () => {
    if (!user) return;

    if (selectedServices.length === 0) {
      alert('Please select at least one service to book.');
      return;
    }

    if (paymentType === 'online' && upiStep !== 'success') {
      setShowUPIModal(true);
      setUpiStep('select');
      return;
    }

    setLoading(true);

    const bookingPayload = {
      userName: user.name,
      serviceType: 'Station Pre-booking', // match schema for services loading
      vehicleType: 'car',
      chargingType: 'normal',
      batteryPercentage: null,
      distanceKm: null,
      powerNeededKwh: null,
      totalAmount,
      paymentType,
      location: null,
      stationName: selectedStation.name,
      delayMinutes: 0,
      selectedServices: selectedServices.map(s => ({
        name: s.service_key === 'car_wash' 
          ? `Car Wash (${washType === 'basic' ? 'Basic' : washType === 'premium' ? 'Premium' : 'Eco'})`
          : s.service_key === 'ev_accessories'
          ? `Accessories Store Purchase`
          : s.service_name,
        price: s.service_key === 'car_wash'
          ? (washType === 'basic' ? 299 : washType === 'premium' ? 599 : 399)
          : s.service_key === 'ev_accessories'
          ? selectedAccessories.reduce((acc, curr) => acc + curr.price, 0)
          : s.price,
        duration: s.duration_mins
      }))
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (!res.ok) {
        throw new Error('Failed to book EV Services');
      }

      localStorage.setItem('last_booking', JSON.stringify({
        serviceType: 'Station Pre-booking',
        vehicleType: 'car',
        chargingType: 'normal',
        totalAmount,
        stationName: selectedStation.name,
        delayMinutes: 0,
        selectedServices: bookingPayload.selectedServices
      }));

      router.push('/thankyou');
    } catch (error) {
      console.error(error);
      alert('Error booking services. Please try again.');
    } finally {
      setLoading(false);
      setShowUPIModal(false);
    }
  };

  const executeUPIPayment = () => {
    setUpiStep('processing');
    setTimeout(() => {
      setUpiStep('success');
    }, 2000);
  };

  if (!user) return null;

  return (
    <Layout>
      <Head>
        <title>Power2Go - EV Station Services</title>
      </Head>

      <main className="container" style={{ flex: 1, paddingBottom: '40px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Book Station Services</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Perform health inspections, detailing, or purchase accessories while charging.</p>
          </div>

          {/* Select Station */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Select Power2Go Hub Station</label>
            <select
              value={selectedStation.id}
              onChange={(e) => {
                const s = PREDEFINED_STATIONS.find(st => st.id === e.target.value);
                if (s) setSelectedStation(s);
              }}
              className="glass-input"
              style={{ fontSize: '0.9rem', padding: '12px' }}
            >
              {PREDEFINED_STATIONS.map((st) => (
                <option key={st.id} value={st.id} style={{ background: '#000', color: '#fff' }}>
                  {st.name} — {st.locationName}
                </option>
              ))}
            </select>
          </div>

          {/* Services Grid */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Choose Add-on Services</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dbServices.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #00aa55' : '1px solid #e2e8f0',
                      background: isSelected ? '#eefdf4' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block', color: isSelected ? '#00aa55' : '#0f172a' }}>
                          {service.service_name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          ⏱️ {service.duration_mins > 0 ? `${service.duration_mins} mins` : 'Varies'} • {service.is_available ? '🟢 Available' : '🔴 Unavailable'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d97706' }}>
                          {service.service_key === 'ev_accessories' ? 'Cart Total' : `₹${service.price}`}
                        </span>
                        <button
                          type="button"
                          disabled={!service.is_available}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedServices(prev => prev.filter(s => s.id !== service.id));
                            } else {
                              setSelectedServices(prev => [...prev, service]);
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            background: isSelected ? '#00aa55' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#475569',
                            border: isSelected ? 'none' : '1px solid #cbd5e1'
                          }}
                        >
                          {isSelected ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {/* Sub-menu if Car Wash is selected */}
                    {isSelected && service.service_key === 'car_wash' && (
                      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        {(['basic', 'premium', 'eco'] as const).map((wType) => (
                          <button
                            key={wType}
                            type="button"
                            onClick={() => setWashType(wType)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: washType === wType ? '#00aa55' : '#cbd5e1',
                              background: washType === wType ? '#eefdf4' : '#ffffff',
                              color: washType === wType ? '#00aa55' : '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ textTransform: 'capitalize', display: 'block', fontWeight: 600 }}>{wType} Wash</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              {wType === 'basic' ? '₹299' : wType === 'premium' ? '₹599' : '₹399'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sub-menu if EV Accessories Store is selected */}
                    {isSelected && service.service_key === 'ev_accessories' && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Items in cart:</span>
                          <button
                            type="button"
                            onClick={() => setShowAccessoryModal(true)}
                            style={{ background: 'none', border: 'none', color: '#00aa55', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ShoppingCart style={{ width: '14px' }} /> Shop Accessories
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedAccessories.length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No items added yet.</span>
                          ) : (
                            selectedAccessories.map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <span>{item.name}</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <strong>₹{item.price}</strong>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAccessories(prev => prev.filter(a => a.id !== item.id))}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Payment Method</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPaymentType('online')}
                className="glass-input"
                style={{
                  borderColor: paymentType === 'online' ? '#00aa55' : '#cbd5e1',
                  background: paymentType === 'online' ? '#eefdf4' : '#ffffff',
                  color: paymentType === 'online' ? '#00aa55' : '#475569',
                  fontSize: '0.85rem',
                  padding: '12px'
                }}
              >
                Pay Online (UPI)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('offline')}
                className="glass-input"
                style={{
                  borderColor: paymentType === 'offline' ? 'var(--accent-green)' : 'var(--border-glass)',
                  background: paymentType === 'offline' ? 'rgba(0, 255, 135, 0.08)' : '',
                  fontSize: '0.85rem',
                  padding: '12px'
                }}
              >
                Pay Cash on Delivery
              </button>
            </div>
          </div>

          {/* Final Pricing breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '12px', marginTop: '4px', fontSize: '1.1rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--accent-green)' }}>Total Cost:</span>
              <span style={{ color: 'var(--accent-green)' }}>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBooking}
            disabled={loading}
            className="glass-button"
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)',
              boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)',
              fontSize: '0.95rem'
            }}
          >
            {loading ? 'Processing...' : 'Confirm Book Services'}
          </button>
        </div>
      </main>

      {/* EV Accessories Store Modal Overlay */}
      {showAccessoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '30px', borderColor: 'var(--accent-green)', boxShadow: '0 0 30px var(--accent-green-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>Power2Go Accessories Store</span>
              </div>
              <button onClick={() => setShowAccessoryModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {ACCESSORIES_LIST.map((item) => {
                const inCart = selectedAccessories.some(a => a.id === item.id);
                return (
                  <div key={item.id} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: inCart ? 'rgba(0, 255, 135, 0.04)' : 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>{item.name}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 700 }}>₹{item.price}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (inCart) {
                          setSelectedAccessories(prev => prev.filter(a => a.id !== item.id));
                        } else {
                          setSelectedAccessories(prev => [...prev, item]);
                        }
                      }}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: inCart ? 'var(--accent-red)' : 'var(--accent-green)', color: inCart ? '#fff' : '#000' }}
                    >
                      {inCart ? 'Remove' : 'Add to Cart'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '15px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Cart Total:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent-green)' }}>₹{selectedAccessories.reduce((acc, curr) => acc + curr.price, 0)}</strong>
            </div>

            <button type="button" onClick={() => setShowAccessoryModal(false)} className="glass-button" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)' }}>
              Apply to Booking
            </button>
          </div>
        </div>
      )}

      {/* UPI Modal */}
      {showUPIModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '30px', textAlign: 'center', borderColor: 'var(--accent-green)', boxShadow: '0 0 30px var(--accent-green-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-green)' }}>UPI Secure checkout</span>
              <button onClick={() => { setShowUPIModal(false); setUpiStep('select'); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {upiStep === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount Due</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '5px' }}>₹{totalAmount.toFixed(2)}</div>
                </div>

                <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', width: '160px', height: '160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#000' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['gpay', 'phonepe', 'paytm'].map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setUpiApp(app as any)}
                      className="glass-input"
                      style={{ padding: '10px 5px', fontSize: '0.75rem', fontWeight: 600, borderColor: upiApp === app ? 'var(--accent-green)' : 'var(--border-glass)' }}
                    >
                      {app.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={executeUPIPayment} className="glass-button" style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)' }}>
                  Pay via UPI
                </button>
              </div>
            )}

            {upiStep === 'processing' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ fontSize: '1.1rem', color: '#fff' }}>Connecting to UPI secure portal...</div>
              </div>
            )}

            {upiStep === 'success' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <ShieldCheck style={{ width: '45px', height: '45px', color: 'var(--accent-green)' }} />
                <h4 style={{ color: 'var(--accent-green)', fontSize: '1.25rem', fontWeight: 700 }}>Payment Successful!</h4>
                <button type="button" onClick={handleBooking} className="glass-button" style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)' }}>
                  Confirm Booking
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
