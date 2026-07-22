import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Navigation, MapPin, CheckCircle, Car, ShieldCheck, Clock, Layers, QrCode } from 'lucide-react';

interface User {
  name: string;
}

interface Station {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  normalSlots: { total: number; available: number };
  fastSlots: { total: number; available: number };
}

const PREDEFINED_STATIONS: Station[] = [
  {
    id: 'station-1',
    name: 'Karur Apolo Hospital Hub',
    locationName: 'Near Karur Apolo Hospital',
    lat: 10.9602,
    lng: 78.0766,
    normalSlots: { total: 10, available: 4 },
    fastSlots: { total: 5, available: 2 },
  },
  {
    id: 'station-2',
    name: 'Coimbatore RK Petrol Bunk Hub',
    locationName: 'Coimbatore RK Petrol Bunk',
    lat: 11.0168,
    lng: 76.9558,
    normalSlots: { total: 12, available: 6 },
    fastSlots: { total: 6, available: 1 },
  },
  {
    id: 'station-3',
    name: 'Kulithalai Bus Stand Station',
    locationName: 'Kulithalai Bus Stand',
    lat: 10.9398,
    lng: 78.4132,
    normalSlots: { total: 8, available: 2 },
    fastSlots: { total: 4, available: 3 },
  },
  {
    id: 'station-4',
    name: 'Trichy Central Hub',
    locationName: 'Trichy Central Bus Stand',
    lat: 10.8056,
    lng: 78.6856,
    normalSlots: { total: 15, available: 7 },
    fastSlots: { total: 5, available: 0 },
  },
];

export default function PowerStation() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Map & Station States
  const [selectedStation, setSelectedStation] = useState<Station>(PREDEFINED_STATIONS[0]);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Booking Form States
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'heavy'>('car');
  const [chargingType, setChargingType] = useState<'normal' | 'fast'>('normal');
  const [delayMinutes, setDelayMinutes] = useState<number>(30); // minutes to reach
  const [paymentType, setPaymentType] = useState<'online' | 'offline'>('online');
  const [loading, setLoading] = useState(false);

  // UPI States
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [upiStep, setUpiStep] = useState<'select' | 'processing' | 'success'>('select');

  // Calculation parameters
  const delayFeePerMinute = 2;
  const bookingHoldCharge = 50; // base slot holding charge
  const estimatedDelayFee = delayMinutes * delayFeePerMinute;
  const totalAmount = bookingHoldCharge + estimatedDelayFee;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleBooking = async () => {
    if (!user) return;

    if (paymentType === 'online' && upiStep !== 'success') {
      setShowUPIModal(true);
      setUpiStep('select');
      return;
    }

    setLoading(true);

    const bookingPayload = {
      userName: user.name,
      serviceType: 'Station Pre-booking',
      vehicleType,
      chargingType,
      batteryPercentage: null,
      distanceKm: null,
      powerNeededKwh: null,
      totalAmount,
      paymentType,
      location: null,
      stationName: selectedStation.name,
      delayMinutes,
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (!res.ok) {
        throw new Error('Failed to pre-book station slot');
      }

      // Store locally for thank you/receipt details
      localStorage.setItem('last_booking', JSON.stringify({
        serviceType: 'Station Pre-booking',
        vehicleType,
        chargingType,
        totalAmount,
        stationName: selectedStation.name,
        delayMinutes
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
      const msgText = `Power2Go Hub Reservation: Dear Customer, your slot at ${selectedStation.name} is confirmed! Please reach within ${delayMinutes} mins. View ticket pass: http://localhost:3000/thankyou`;
      window.open(`https://api.whatsapp.com/send?phone=91${mobile}&text=${encodeURIComponent(msgText)}`, '_blank');

      // Redirect to en-route tracking screen
      router.push('/thankyou');
    } catch (error) {
      console.error(error);
      alert('Error pre-booking slot. Please try again.');
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
        <title>Power2Go - Find Charging Stations</title>
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
          <Navigation style={{ color: 'var(--accent-green)', width: '24px' }} />
          <h1 className="gradient-text-green" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Station Finder & Booking
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, paddingTop: '10px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', alignItems: 'start' }}>
          
          {/* Map Side (Interactive Grid Map) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Power2Go Live Grid Map</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Select a station from the interactive grid below to view slots & reserve</p>
            </div>

            {/* Interactive Vector Map Widget */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '350px',
              background: '#090a0f',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundImage: 'radial-gradient(var(--border-glass) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}>
              {/* Simulated Roads/Grid */}
              <div style={{ position: 'absolute', width: '2px', height: '100%', background: 'rgba(255,255,255,0.02)', left: '30%' }}></div>
              <div style={{ position: 'absolute', width: '2px', height: '100%', background: 'rgba(255,255,255,0.02)', left: '70%' }}></div>
              <div style={{ position: 'absolute', height: '2px', width: '100%', background: 'rgba(255,255,255,0.02)', top: '40%' }}></div>
              <div style={{ position: 'absolute', height: '2px', width: '100%', background: 'rgba(255,255,255,0.02)', top: '75%' }}></div>

              {/* Glowing connection lines from selected station */}
              <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
                <circle
                  cx={selectedStation.id === 'station-1' ? '120' : selectedStation.id === 'station-2' ? '280' : selectedStation.id === 'station-3' ? '160' : '320'}
                  cy={selectedStation.id === 'station-1' ? '100' : selectedStation.id === 'station-2' ? '150' : selectedStation.id === 'station-3' ? '260' : '200'}
                  r="30"
                  fill="none"
                  stroke="var(--accent-green)"
                  strokeWidth="1.5"
                  opacity="0.5"
                  style={{ transformOrigin: 'center' }}
                >
                  <animate attributeName="r" values="10;45;10" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="3s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Predefined Station Nodes on Grid */}
              {/* Station 1: Karur Apolo */}
              <button
                type="button"
                onClick={() => setSelectedStation(PREDEFINED_STATIONS[0])}
                style={{
                  position: 'absolute',
                  left: '120px',
                  top: '100px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <MapPin style={{
                  color: selectedStation.id === 'station-1' ? 'var(--accent-green)' : 'var(--accent-blue)',
                  width: selectedStation.id === 'station-1' ? '36px' : '26px',
                  height: selectedStation.id === 'station-1' ? '36px' : '26px',
                  filter: selectedStation.id === 'station-1' ? 'drop-shadow(0 0 8px var(--accent-green))' : 'none',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.65rem',
                  background: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)',
                  color: '#fff'
                }}>Karur Apollo</span>
              </button>

              {/* Station 2: Coimbatore RK */}
              <button
                type="button"
                onClick={() => setSelectedStation(PREDEFINED_STATIONS[1])}
                style={{
                  position: 'absolute',
                  left: '280px',
                  top: '150px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <MapPin style={{
                  color: selectedStation.id === 'station-2' ? 'var(--accent-green)' : 'var(--accent-blue)',
                  width: selectedStation.id === 'station-2' ? '36px' : '26px',
                  height: selectedStation.id === 'station-2' ? '36px' : '26px',
                  filter: selectedStation.id === 'station-2' ? 'drop-shadow(0 0 8px var(--accent-green))' : 'none',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.65rem',
                  background: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)',
                  color: '#fff'
                }}>Coimbatore RK</span>
              </button>

              {/* Station 3: Kulithalai */}
              <button
                type="button"
                onClick={() => setSelectedStation(PREDEFINED_STATIONS[2])}
                style={{
                  position: 'absolute',
                  left: '160px',
                  top: '260px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <MapPin style={{
                  color: selectedStation.id === 'station-3' ? 'var(--accent-green)' : 'var(--accent-blue)',
                  width: selectedStation.id === 'station-3' ? '36px' : '26px',
                  height: selectedStation.id === 'station-3' ? '36px' : '26px',
                  filter: selectedStation.id === 'station-3' ? 'drop-shadow(0 0 8px var(--accent-green))' : 'none',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.65rem',
                  background: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)',
                  color: '#fff'
                }}>Kulithalai Bus Stand</span>
              </button>

              {/* Station 4: Trichy Central */}
              <button
                type="button"
                onClick={() => setSelectedStation(PREDEFINED_STATIONS[3])}
                style={{
                  position: 'absolute',
                  left: '320px',
                  top: '200px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <MapPin style={{
                  color: selectedStation.id === 'station-4' ? 'var(--accent-green)' : 'var(--accent-blue)',
                  width: selectedStation.id === 'station-4' ? '36px' : '26px',
                  height: selectedStation.id === 'station-4' ? '36px' : '26px',
                  filter: selectedStation.id === 'station-4' ? 'drop-shadow(0 0 8px var(--accent-green))' : 'none',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.65rem',
                  background: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)',
                  color: '#fff'
                }}>Trichy Central</span>
              </button>
            </div>

            {/* Station Live Stats */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Layers style={{ color: 'var(--accent-green)', width: '18px' }} />
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedStation.name}</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Normal Slots (₹13/kWh)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                      {selectedStation.normalSlots.available}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      / {selectedStation.normalSlots.total} free
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fast Slots (₹18/kWh)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: selectedStation.fastSlots.available > 0 ? 'var(--accent-blue)' : 'var(--accent-red)'
                    }}>
                      {selectedStation.fastSlots.available}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      / {selectedStation.fastSlots.total} free
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowBookingForm(true)}
              className="glass-button"
              style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)', boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)' }}
            >
              Pre-Book slots at this Hub
            </button>
          </div>

          {/* Booking / Details Panel */}
          {showBookingForm ? (
            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Reserve Charging Slot</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Secure your place at {selectedStation.name}</p>
              </div>

              {/* Vehicle Type */}
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Vehicle Type</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['motorcycle', 'car', 'heavy'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVehicleType(type as any)}
                      className="glass-input"
                      style={{
                        padding: '10px',
                        textTransform: 'capitalize',
                        borderColor: vehicleType === type ? 'var(--accent-green)' : 'var(--border-glass)',
                        background: vehicleType === type ? 'rgba(0, 255, 135, 0.08)' : '',
                        fontSize: '0.8rem'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Charging Type */}
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Charging Profile</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setChargingType('normal')}
                    className="glass-input"
                    style={{
                      borderColor: chargingType === 'normal' ? 'var(--accent-green)' : 'var(--border-glass)',
                      background: chargingType === 'normal' ? 'rgba(0, 255, 135, 0.08)' : '',
                      fontSize: '0.8rem'
                    }}
                  >
                    Normal (13/kWh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargingType('fast')}
                    className="glass-input"
                    style={{
                      borderColor: chargingType === 'fast' ? 'var(--accent-green)' : 'var(--border-glass)',
                      background: chargingType === 'fast' ? 'rgba(0, 255, 135, 0.08)' : '',
                      fontSize: '0.8rem'
                    }}
                    disabled={selectedStation.fastSlots.available === 0}
                  >
                    Fast (18/kWh) {selectedStation.fastSlots.available === 0 ? '(Full)' : ''}
                  </button>
                </div>
              </div>

              {/* Reach Timer (Reach Selection Buttons) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock style={{ width: '14px' }} />
                    Estimated Reach Time
                  </h4>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-orange)' }}>
                    {delayMinutes} Minutes
                  </span>
                </div>
                
                {/* 10, 20, 30, 40, 50, 60 minutes button group selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  {[10, 20, 30, 40, 50, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDelayMinutes(mins)}
                      className="glass-input"
                      style={{
                        padding: '10px 5px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        borderColor: delayMinutes === mins ? 'var(--accent-orange)' : 'var(--border-glass)',
                        background: delayMinutes === mins ? 'rgba(255, 159, 0, 0.15)' : 'rgba(0,0,0,0.3)',
                        color: delayMinutes === mins ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {mins} Mins
                    </button>
                  ))}
                </div>
                
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  * Slot reservation holds apply at ₹2/min to secure slot hold (₹{estimatedDelayFee} holds slot).
                </span>
              </div>

              {/* Payment Configuration */}
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Payment Option</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentType('online')}
                    className="glass-input"
                    style={{
                      borderColor: paymentType === 'online' ? 'var(--accent-green)' : 'var(--border-glass)',
                      background: paymentType === 'online' ? 'rgba(0, 255, 135, 0.08)' : '',
                      fontSize: '0.8rem'
                    }}
                  >
                    Online Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('offline')}
                    className="glass-input"
                    style={{
                      borderColor: paymentType === 'offline' ? 'var(--accent-green)' : 'var(--border-glass)',
                      background: paymentType === 'offline' ? 'rgba(0, 255, 135, 0.08)' : '',
                      fontSize: '0.8rem'
                    }}
                  >
                    Offline Pay at Station
                  </button>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Base Slot Hold Fee</span>
                  <span>₹{bookingHoldCharge.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estimated Travel Delay (₹2/min)</span>
                  <span>₹{estimatedDelayFee.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span>Total Hold Fee</span>
                  <span style={{ color: 'var(--accent-green)' }}>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="glass-button secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    flex: 2,
                    padding: '10px',
                    background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)',
                    boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)'
                  }}
                >
                  {loading ? 'Securing Slot...' : 'Confirm Pre-Booking'}
                </button>
              </div>

            </div>
          ) : (
            /* General Station details for users who are just browsing */
            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Station Overview</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>View direct physical details</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hub Destination</h4>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>{selectedStation.name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coordinates: {selectedStation.lat}, {selectedStation.lng}</p>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Operational Capacity</h4>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Open 24 Hours / 7 Days a week.</li>
                    <li>Fast Charging slots supply up to 150kW.</li>
                    <li>Normal Charging slots supply standard 22kW AC.</li>
                    <li>Equipped with customer lounge, Wi-Fi, and coffee shop.</li>
                  </ul>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0, 255, 135, 0.05)',
                  border: '1px solid rgba(0, 255, 135, 0.2)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <ShieldCheck style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                  <span>Pre-booking guarantees a free slot upon arrival. Unreserved slots are subject to queue.</span>
                </div>
              </div>
            </div>
          )}

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
            borderColor: 'var(--accent-green)',
            boxShadow: '0 0 30px var(--accent-green-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-green)' }}>UPI Station Booking Pay</span>
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
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reservation Deposit</span>
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
                  style={{ width: '100%', marginTop: '15px', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)', boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)' }}
                >
                  Pay via {upiApp === 'gpay' ? 'Google Pay' : upiApp === 'phonepe' ? 'PhonePe' : 'Paytm'}
                </button>
              </div>
            )}

            {upiStep === 'processing' && (
              <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="fingerprint-widget scanning" style={{ border: '2px solid var(--accent-green)' }}>
                  <div className="scan-line" style={{ background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></div>
                  <QrCode style={{ width: '40px', height: '40px', color: 'var(--accent-green)' }} />
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
                    Confirm Reservation & Send WhatsApp
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
