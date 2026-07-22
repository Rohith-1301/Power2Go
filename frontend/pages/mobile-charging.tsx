import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Bike, Car, Truck, MapPin, CheckCircle, Smartphone, HelpCircle, QrCode, ShieldCheck } from 'lucide-react';

interface User {
  name: string;
}

export default function MobileCharging() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // States
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'heavy'>('car');
  const [batteryPercentage, setBatteryPercentage] = useState<number>(30);
  const [chargingType, setChargingType] = useState<'normal' | 'fast'>('normal');
  const [locationShared, setLocationShared] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [paymentType, setPaymentType] = useState<'online' | 'cod'>('online');
  const [loading, setLoading] = useState(false);

  // UPI States
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [upiStep, setUpiStep] = useState<'select' | 'processing' | 'success'>('select');

  // Rate Constants
  const pricePerKm = 20;
  const normalPricePerKwh = 13;
  const fastPricePerKwh = 18;

  // Battery capacity mock based on vehicle type (in kWh)
  const batteryCapacities = {
    motorcycle: 15,
    car: 60,
    heavy: 150,
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Derived Calculations
  const ratePerKwh = chargingType === 'fast' ? fastPricePerKwh : normalPricePerKwh;
  const capacity = batteryCapacities[vehicleType];
  const powerNeeded = parseFloat(((capacity * (100 - batteryPercentage)) / 100).toFixed(2));
  
  const distanceFee = distance ? distance * pricePerKm : 0;
  const powerFee = powerNeeded * ratePerKwh;
  const totalAmount = parseFloat((distanceFee + powerFee).toFixed(2));

  const handleShareLocation = () => {
    setLocationShared(false);
    setLocationAddress('Locating...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setLocationAddress(`Current Location (Lat: ${lat}, Lng: ${lng})`);
          
          // Generate a realistic distance based on simulated coordinates
          const randomDistance = parseFloat((Math.random() * 15 + 2).toFixed(1)); // 2 to 17 km
          setDistance(randomDistance);
          setLocationShared(true);
        },
        (error) => {
          // Fallback if browser permission is denied or fails
          console.warn('Geolocation failed, simulating location coordinates.');
          setTimeout(() => {
            setLocationAddress('Apex Business Park, Karur Road, Coimbatore');
            setDistance(12.4); // Mock distance
            setLocationShared(true);
          }, 1000);
        }
      );
    } else {
      // Browsers with no geolocation
      setLocationAddress('Trichy Central Main Road, Trichy');
      setDistance(18.5);
      setLocationShared(true);
    }
  };

  const handleBooking = async () => {
    if (!locationShared || !user) return;

    if (paymentType === 'online' && upiStep !== 'success') {
      setShowUPIModal(true);
      setUpiStep('select');
      return;
    }

    setLoading(true);

    const bookingPayload = {
      userName: user.name,
      serviceType: 'Mobile Charging',
      vehicleType,
      chargingType,
      batteryPercentage,
      distanceKm: distance,
      powerNeededKwh: powerNeeded,
      totalAmount,
      paymentType,
      location: locationAddress,
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (!res.ok) {
        throw new Error('Failed to book charging service');
      }

      // Store current booking locally for confirmation page/feedback context
      localStorage.setItem('last_booking', JSON.stringify({
        serviceType: 'Mobile Charging',
        vehicleType,
        chargingType,
        totalAmount,
        location: locationAddress
      }));

      sessionStorage.setItem('whatsapp_sent_for_booking', 'true'); // mark as sent to avoid double popups on load

      // Open WhatsApp pre-filled window in the event handler to bypass popup blockers
      let mobile = '8903381167';
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed.registerNumber && parsed.registerNumber !== 'N/A') {
          mobile = parsed.registerNumber;
        }
      }
      const msgText = `Power2Go: Dear Customer, your order is confirmed! Track the live en-route movement of our dispatched charging vehicle: http://localhost:3000/thankyou`;
      window.open(`https://api.whatsapp.com/send?phone=91${mobile}&text=${encodeURIComponent(msgText)}`, '_blank');

      // Redirect to en-route tracking screen
      router.push('/thankyou');
    } catch (error) {
      console.error(error);
      alert('Error booking service. Please try again.');
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>Power2Go - Mobile Charging Order</title>
      </Head>

      {/* Header Bar */}
      <header className="glass-panel" style={{
        margin: '20px',
        padding: '15px 30px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderRadius: '16px'
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft style={{ width: '20px' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone style={{ color: 'var(--accent-blue)', width: '24px' }} />
          <h1 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Mobile Charging Order
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, paddingTop: '10px' }}>
        
        {/* Floating Rates Banner */}
        <div className="glass-panel" style={{
          padding: '15px 25px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          borderColor: 'var(--accent-blue-glow)',
          background: 'rgba(0, 210, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Normal Price</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>₹13 / pkw (kWh)</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'var(--border-glass)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fast Price</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>₹18 / pkw (kWh)</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'var(--border-glass)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Travel Distance Fee</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>₹20 / km</span>
          </div>
        </div>

        {/* Form and Preview Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          
          {/* Form Side */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Vehicle Type Selection */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>Select Vehicle Type</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setVehicleType('motorcycle')}
                  className="glass-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    borderColor: vehicleType === 'motorcycle' ? 'var(--accent-blue)' : 'var(--border-glass)',
                    background: vehicleType === 'motorcycle' ? 'rgba(0, 210, 255, 0.1)' : ''
                  }}
                >
                  <Bike style={{ width: '24px', height: '24px', color: vehicleType === 'motorcycle' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.8rem' }}>Motorcycle</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVehicleType('car')}
                  className="glass-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    borderColor: vehicleType === 'car' ? 'var(--accent-blue)' : 'var(--border-glass)',
                    background: vehicleType === 'car' ? 'rgba(0, 210, 255, 0.1)' : ''
                  }}
                >
                  <Car style={{ width: '24px', height: '24px', color: vehicleType === 'car' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.8rem' }}>Car</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType('heavy')}
                  className="glass-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    borderColor: vehicleType === 'heavy' ? 'var(--accent-blue)' : 'var(--border-glass)',
                    background: vehicleType === 'heavy' ? 'rgba(0, 210, 255, 0.1)' : ''
                  }}
                >
                  <Truck style={{ width: '24px', height: '24px', color: vehicleType === 'heavy' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.8rem' }}>Heavy</span>
                </button>
              </div>
            </div>

            {/* Battery Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Current Battery Power</h3>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {batteryPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="glass-input"
                style={{ height: '8px', padding: 0 }}
                value={batteryPercentage}
                onChange={(e) => setBatteryPercentage(parseInt(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>0% Empty</span>
                <span>100% Charged</span>
              </div>
            </div>

            {/* Charging Speed Selection */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>Select Charging Type</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <button
                  type="button"
                  onClick={() => setChargingType('normal')}
                  className="glass-input"
                  style={{
                    borderColor: chargingType === 'normal' ? 'var(--accent-blue)' : 'var(--border-glass)',
                    background: chargingType === 'normal' ? 'rgba(0, 210, 255, 0.1)' : '',
                    fontWeight: chargingType === 'normal' ? 600 : 400
                  }}
                >
                  Normal Charge (13/pkw)
                </button>
                <button
                  type="button"
                  onClick={() => setChargingType('fast')}
                  className="glass-input"
                  style={{
                    borderColor: chargingType === 'fast' ? 'var(--accent-blue)' : 'var(--border-glass)',
                    background: chargingType === 'fast' ? 'rgba(0, 210, 255, 0.1)' : '',
                    color: chargingType === 'fast' ? 'var(--accent-green)' : '#fff',
                    fontWeight: chargingType === 'fast' ? 600 : 400
                  }}
                >
                  Fast Charge (18/pkw)
                </button>
              </div>
            </div>

            {/* Location Sharing */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>Live Location</h3>
              {!locationShared ? (
                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="glass-button secondary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    borderColor: 'var(--accent-blue)'
                  }}
                >
                  <MapPin style={{ width: '18px', color: 'var(--accent-blue)' }} />
                  Share Your Live Location
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(0, 255, 135, 0.05)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}>
                  <CheckCircle style={{ color: 'var(--accent-green)', width: '20px', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>Location Shared</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {locationAddress}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Pricing Summary Side */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '30px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                Charge Breakdown
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle Class Capacity</span>
                  <span style={{ fontWeight: 600 }}>{capacity} kWh</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deficit Power Required</span>
                  <span style={{ fontWeight: 600 }}>{powerNeeded} kWh</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Power Unit Fee ({ratePerKwh}/kWh)</span>
                  <span style={{ fontWeight: 600 }}>₹{powerFee.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dispatched Travel Distance</span>
                  <span style={{ fontWeight: 600 }}>{distance ? `${distance} km` : 'Pending Location'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Distance Fee (₹{pricePerKm}/km)</span>
                  <span style={{ fontWeight: 600 }}>₹{distanceFee.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment & Action Area */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              
              {/* Payment Type */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Payment Option</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    borderColor: paymentType === 'online' ? 'var(--accent-blue)' : 'var(--border-glass)'
                  }}>
                    <input
                      type="radio"
                      name="paymentType"
                      value="online"
                      checked={paymentType === 'online'}
                      onChange={() => setPaymentType('online')}
                    />
                    <span style={{ fontSize: '0.85rem' }}>Online Pay</span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    borderColor: paymentType === 'cod' ? 'var(--accent-blue)' : 'var(--border-glass)'
                  }}>
                    <input
                      type="radio"
                      name="paymentType"
                      value="cod"
                      checked={paymentType === 'cod'}
                      onChange={() => setPaymentType('cod')}
                    />
                    <span style={{ fontSize: '0.85rem' }}>Cash on Delivery</span>
                  </label>
                </div>
              </div>

              {/* Total Card */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--border-glass)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Payable</span>
                <span className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBooking}
                disabled={!locationShared || loading}
                className="glass-button"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? 'Confirming Order...' : 'Confirm and Order Charging'}
              </button>
              
              {!locationShared && (
                <span style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '8px' }}>
                  * Please share your live location to calculate rates & distance
                </span>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* UPI Payment Gateway Dialog Overlay */}
      {showUPIModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '30px',
            textAlign: 'center',
            borderColor: 'var(--accent-blue)',
            boxShadow: '0 0 30px var(--accent-blue-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-blue)' }}>UPI Payment Gateway</span>
              <button 
                onClick={() => { setShowUPIModal(false); setUpiStep('select'); }}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {upiStep === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount to Pay</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '5px' }}>₹{totalAmount.toFixed(2)}</div>
                </div>

                {/* QR Code emulation */}
                <div style={{
                  background: '#fff',
                  padding: '15px',
                  borderRadius: '12px',
                  width: '160px',
                  height: '160px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(255,255,255,0.1)'
                }}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#000' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scan QR or Select UPI App to complete payment</span>

                {/* UPI Apps Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                  {[
                    { id: 'gpay', name: 'Google Pay', color: '#4285F4' },
                    { id: 'phonepe', name: 'PhonePe', color: '#5f259f' },
                    { id: 'paytm', name: 'Paytm', color: '#00baf2' }
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setUpiApp(app.id as any)}
                      className="glass-input"
                      style={{
                        padding: '10px 5px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderColor: upiApp === app.id ? app.color : 'var(--border-glass)',
                        background: upiApp === app.id ? `rgba(${app.id === 'gpay' ? '66,133,244' : app.id === 'phonepe' ? '95,37,159' : '0,186,242'}, 0.15)` : 'rgba(0,0,0,0.3)',
                        color: upiApp === app.id ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: app.color, display: 'inline-block', marginRight: '6px' }}></div>
                      {app.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={executeUPIPayment}
                  className="glass-button"
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  Pay via {upiApp === 'gpay' ? 'Google Pay' : upiApp === 'phonepe' ? 'PhonePe' : 'Paytm'}
                </button>
              </div>
            )}

            {upiStep === 'processing' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="fingerprint-widget scanning" style={{ border: '2px solid var(--accent-blue)' }}>
                  <div className="scan-line" style={{ background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></div>
                  <QrCode style={{ width: '40px', height: '40px', color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Connecting to UPI Secure Portal...</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
                    Accessing your {upiApp === 'gpay' ? 'Google Pay' : upiApp === 'phonepe' ? 'PhonePe' : 'Paytm'} app to authorize ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {upiStep === 'success' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="fingerprint-widget success" style={{ border: '2px solid var(--accent-green)' }}>
                  <ShieldCheck style={{ width: '45px', height: '45px', color: 'var(--accent-green)' }} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--accent-green)', fontSize: '1.25rem', fontWeight: 700 }}>Payment Successful!</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', marginBottom: '15px' }}>
                    UPI Transaction ID: UPI{Math.floor(100000 + Math.random() * 900000)}P2G
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleBooking}
                    className="glass-button"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)',
                      boxShadow: '0 4px 15px rgba(0, 255, 135, 0.3)',
                      color: '#000',
                      fontWeight: 700,
                      padding: '12px'
                    }}
                  >
                    Confirm Order & Send WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
