import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Bike, Car, Truck, MapPin, CheckCircle, ShieldAlert, QrCode, ShieldCheck } from 'lucide-react';

interface User {
  name: string;
}

export default function EmergencyCharging() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // States
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'heavy'>('car');
  const [batteryPercentage, setBatteryPercentage] = useState<number>(10); // Standard lower start for emergency
  const [locationShared, setLocationShared] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [paymentType, setPaymentType] = useState<'online' | 'cod'>('online');
  const [loading, setLoading] = useState(false);

  // UPI States
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [upiStep, setUpiStep] = useState<'select' | 'processing' | 'success'>('select');

  // Emergency Specific Rates
  const pricePerKm = 25;
  const ratePerKwh = 20;

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

  // Calculations
  const capacity = batteryCapacities[vehicleType];
  const powerNeeded = parseFloat(((capacity * (100 - batteryPercentage)) / 100).toFixed(2));
  
  const distanceFee = distance ? distance * pricePerKm : 0;
  const powerFee = powerNeeded * ratePerKwh;
  const totalAmount = parseFloat((distanceFee + powerFee).toFixed(2));

  const handleShareLocation = () => {
    setLocationShared(false);
    setLocationAddress('Locating SOS Signal...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setLocationAddress(`SOS Location (Lat: ${lat}, Lng: ${lng})`);
          const randomDistance = parseFloat((Math.random() * 10 + 1).toFixed(1)); // Emergency vehicles are closer: 1 to 11 km
          setDistance(randomDistance);
          setLocationShared(true);
        },
        (error) => {
          console.warn('Emergency geolocation failed, using fallback.');
          setTimeout(() => {
            setLocationAddress('NH-44 Highway Road, near Coimbatore RK Petrol Bunk');
            setDistance(7.8);
            setLocationShared(true);
          }, 1000);
        }
      );
    } else {
      setLocationAddress('Kulithalai Main Highway, Trichy Bypass');
      setDistance(15.2);
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
      serviceType: 'Emergency Charging',
      vehicleType,
      chargingType: 'Fast-SOS',
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
        throw new Error('Failed to book emergency charging service');
      }

      // Store locally
      localStorage.setItem('last_booking', JSON.stringify({
        serviceType: 'Emergency Charging',
        vehicleType,
        chargingType: 'Fast-SOS',
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
      alert('Error booking emergency service. Please try again.');
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
        <title>Power2Go - SOS Emergency Charging</title>
      </Head>

      {/* Pulsing glow background effect for emergency */}
      <style jsx global>{`
        body {
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(255, 42, 95, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(255, 159, 0, 0.05) 0%, transparent 40%) !important;
        }
      `}</style>

      {/* Header Bar */}
      <header className="glass-panel" style={{
        margin: '20px',
        padding: '15px 30px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderRadius: '16px',
        borderColor: 'rgba(255, 42, 95, 0.4)'
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
          <ShieldAlert style={{ color: 'var(--accent-red)', width: '24px' }} />
          <h1 className="gradient-text-red" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            SOS Emergency Charging
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, paddingTop: '10px' }}>
        
        {/* Urgent Rate Notification Bar */}
        <div className="glass-panel" style={{
          padding: '15px 25px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          borderColor: 'rgba(255, 42, 95, 0.4)',
          background: 'rgba(255, 42, 95, 0.05)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority Mode Charge Rate</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>₹20 / pkw (kWh)</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'var(--border-glass)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority Distance Dispatch Fee</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-orange)' }}>₹25 / km</span>
          </div>
        </div>

        {/* Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          
          {/* Form Side */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px', borderColor: 'rgba(255, 42, 95, 0.15)' }}>
            
            {/* Vehicle Type Selection */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>Select Stranded Vehicle</h3>
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
                    borderColor: vehicleType === 'motorcycle' ? 'var(--accent-red)' : 'var(--border-glass)',
                    background: vehicleType === 'motorcycle' ? 'rgba(255, 42, 95, 0.1)' : ''
                  }}
                >
                  <Bike style={{ width: '24px', height: '24px', color: vehicleType === 'motorcycle' ? 'var(--accent-red)' : 'var(--text-secondary)' }} />
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
                    borderColor: vehicleType === 'car' ? 'var(--accent-red)' : 'var(--border-glass)',
                    background: vehicleType === 'car' ? 'rgba(255, 42, 95, 0.1)' : ''
                  }}
                >
                  <Car style={{ width: '24px', height: '24px', color: vehicleType === 'car' ? 'var(--accent-red)' : 'var(--text-secondary)' }} />
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
                    borderColor: vehicleType === 'heavy' ? 'var(--accent-red)' : 'var(--border-glass)',
                    background: vehicleType === 'heavy' ? 'rgba(255, 42, 95, 0.1)' : ''
                  }}
                >
                  <Truck style={{ width: '24px', height: '24px', color: vehicleType === 'heavy' ? 'var(--accent-red)' : 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.8rem' }}>Heavy</span>
                </button>
              </div>
            </div>

            {/* Battery Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Approx. Remaining Battery</h3>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                  {batteryPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50" // Lock slider range down for true emergency situations
                className="glass-input"
                style={{ height: '8px', padding: 0 }}
                value={batteryPercentage}
                onChange={(e) => setBatteryPercentage(parseInt(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>0% Stranded</span>
                <span>50% Low Power</span>
              </div>
            </div>

            {/* Location Sharing */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>SOS Coordinates</h3>
              {!locationShared ? (
                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="glass-button emergency"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <MapPin style={{ width: '18px', color: '#fff' }} />
                  Transmit Live SOS Location
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255, 42, 95, 0.05)',
                  border: '1px solid var(--accent-red)',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}>
                  <CheckCircle style={{ color: 'var(--accent-red)', width: '20px', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>SOS Beacon Broadcasting</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {locationAddress}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Breakdown / Payment Side */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '30px', borderColor: 'rgba(255, 42, 95, 0.15)' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                SOS Charge Breakdown
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle Capacity</span>
                  <span style={{ fontWeight: 600 }}>{capacity} kWh</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Deficit Power Required</span>
                  <span style={{ fontWeight: 600 }}>{powerNeeded} kWh</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SOS Power Cost (₹{ratePerKwh}/kWh)</span>
                  <span style={{ fontWeight: 600 }}>₹{powerFee.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SOS Response Distance</span>
                  <span style={{ fontWeight: 600 }}>{distance ? `${distance} km` : 'Broadcasting Beacon...'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SOS Travel Fee (₹{pricePerKm}/km)</span>
                  <span style={{ fontWeight: 600 }}>₹{distanceFee.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              
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
                    borderColor: paymentType === 'online' ? 'var(--accent-red)' : 'var(--border-glass)'
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
                    borderColor: paymentType === 'cod' ? 'var(--accent-red)' : 'var(--border-glass)'
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
                background: 'rgba(255,42,95,0.03)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 42, 95, 0.25)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Urgent Payable</span>
                <span className="gradient-text-red" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBooking}
                disabled={!locationShared || loading}
                className="glass-button emergency"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? 'Dispatching SOS...' : 'Request Immediate SOS Response'}
              </button>
              
              {!locationShared && (
                <span style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '8px' }}>
                  * Please broadcast your SOS location coordinates to dispatch help
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
            borderColor: 'var(--accent-red)',
            boxShadow: '0 0 30px var(--accent-red-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-red)' }}>UPI SOS Payment</span>
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
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SOS Amount to Pay</span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scan QR or Select UPI App to authorize SOS payment</span>

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
                  style={{ width: '100%', marginTop: '15px', background: 'linear-gradient(135deg, var(--accent-red) 0%, #b20a32 100%)', boxShadow: '0 4px 15px rgba(255, 42, 95, 0.3)' }}
                >
                  Pay via {upiApp === 'gpay' ? 'Google Pay' : upiApp === 'phonepe' ? 'PhonePe' : 'Paytm'}
                </button>
              </div>
            )}

            {upiStep === 'processing' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="fingerprint-widget scanning" style={{ border: '2px solid var(--accent-red)' }}>
                  <div className="scan-line" style={{ background: 'var(--accent-red)', boxShadow: '0 0 8px var(--accent-red)' }}></div>
                  <QrCode style={{ width: '40px', height: '40px', color: 'var(--accent-red)' }} />
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
                    Confirm SOS & Send WhatsApp
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
