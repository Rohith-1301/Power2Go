import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Navigation, MapPin, CheckCircle, Car, ShieldCheck, Clock, Layers, QrCode } from 'lucide-react';
import Layout from '@/components/Layout';

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
    id: 'station-velachery',
    name: 'Power2Go – Velachery',
    locationName: 'Phoenix Marketcity, Velachery, Chennai',
    lat: 12.9915,
    lng: 80.2173,
    normalSlots: { total: 8, available: 5 },
    fastSlots: { total: 6, available: 3 },
  },
  {
    id: 'station-sholinganallur',
    name: 'Power2Go – Sholinganallur',
    locationName: 'OMR IT Corridor, Sholinganallur, Chennai',
    lat: 12.9010,
    lng: 80.2279,
    normalSlots: { total: 10, available: 6 },
    fastSlots: { total: 6, available: 3 },
  },
  {
    id: 'station-mattuthavani',
    name: 'Power2Go – Mattuthavani',
    locationName: 'Mattuthavani Bus Stand Road, Madurai',
    lat: 9.9322,
    lng: 78.1561,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 4 },
  },
  {
    id: 'station-trichy',
    name: 'Power2Go – Trichy Central',
    locationName: 'Central Bus Stand, Trichy',
    lat: 10.8056,
    lng: 78.6856,
    normalSlots: { total: 12, available: 6 },
    fastSlots: { total: 8, available: 6 },
  },
  {
    id: 'station-karur',
    name: 'Power2Go – Karur Bus Stand',
    locationName: 'Karur Bus Stand, Karur',
    lat: 10.9602,
    lng: 78.0766,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 2 },
  },
  {
    id: 'station-villupuram',
    name: 'Power2Go – Villupuram New Bus Stand',
    locationName: 'Villupuram New Bus Stand, Villupuram',
    lat: 11.9401,
    lng: 79.4861,
    normalSlots: { total: 10, available: 7 },
    fastSlots: { total: 8, available: 7 },
  },
  {
    id: 'station-namakkal',
    name: 'Power2Go – Namakkal NH44',
    locationName: 'NH44 Highway, Namakkal',
    lat: 11.2189,
    lng: 78.1673,
    normalSlots: { total: 12, available: 8 },
    fastSlots: { total: 8, available: 8 },
  },
  {
    id: 'station-salem',
    name: 'Power2Go – Five Roads Junction',
    locationName: 'Five Roads Junction, Salem',
    lat: 11.6643,
    lng: 78.1460,
    normalSlots: { total: 12, available: 5 },
    fastSlots: { total: 8, available: 5 },
  },
  {
    id: 'station-dindigul',
    name: 'Power2Go – Dindigul NH44',
    locationName: 'NH44 Bypass, Dindigul',
    lat: 10.3673,
    lng: 77.9803,
    normalSlots: { total: 8, available: 3 },
    fastSlots: { total: 4, available: 3 },
  },
  {
    id: 'station-virudhunagar',
    name: 'Power2Go – Virudhunagar Bus Stand',
    locationName: 'Virudhunagar Bus Stand, Virudhunagar',
    lat: 9.5872,
    lng: 77.9578,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 4 },
  },
  {
    id: 'station-kulithalai',
    name: 'Power2Go – Kulithalai Bus Stand',
    locationName: 'Kulithalai Bus Stand, Kulithalai',
    lat: 10.9385,
    lng: 78.4145,
    normalSlots: { total: 6, available: 2 },
    fastSlots: { total: 4, available: 3 },
  },
  {
    id: 'station-ariyalur',
    name: 'Power2Go – Ariyalur Bus Stand',
    locationName: 'Ariyalur Bus Stand, Ariyalur',
    lat: 11.1401,
    lng: 79.0786,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 4 },
  },
  {
    id: 'station-erode',
    name: 'Power2Go – Texvalley Mall',
    locationName: 'Texvalley Mall, Gangapuram, Erode',
    lat: 11.3710,
    lng: 77.7285,
    normalSlots: { total: 10, available: 5 },
    fastSlots: { total: 6, available: 5 },
  },
  {
    id: 'station-coimbatore-1',
    name: 'Power2Go – Brookefields Mall',
    locationName: 'Brookefields Mall, Coimbatore',
    lat: 11.0125,
    lng: 76.9582,
    normalSlots: { total: 12, available: 4 },
    fastSlots: { total: 8, available: 4 },
  },
  {
    id: 'station-coimbatore-2',
    name: 'Power2Go – Avinashi Road',
    locationName: 'Avinashi Road, Coimbatore',
    lat: 11.0252,
    lng: 77.0123,
    normalSlots: { total: 10, available: 5 },
    fastSlots: { total: 6, available: 5 },
  },
  {
    id: 'station-nilgiris',
    name: 'Power2Go – Coonoor Town',
    locationName: 'Coonoor Town, Nilgiris',
    lat: 11.3530,
    lng: 76.7959,
    normalSlots: { total: 8, available: 3 },
    fastSlots: { total: 4, available: 3 },
  },
  {
    id: 'station-ooty',
    name: 'Power2Go – Ooty Bus Stand',
    locationName: 'Ooty Bus Stand, Ooty',
    lat: 11.4064,
    lng: 76.6932,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 4 },
  },
  {
    id: 'station-kodaikanal',
    name: 'Power2Go – Kodaikanal Bus Stand',
    locationName: 'Kodaikanal Bus Stand, Kodaikanal',
    lat: 10.2381,
    lng: 77.4892,
    normalSlots: { total: 8, available: 3 },
    fastSlots: { total: 4, available: 3 },
  },
  {
    id: 'station-ramanathapuram',
    name: 'Power2Go – Ramanathapuram Bus Stand',
    locationName: 'Ramanathapuram Bus Stand, Ramanathapuram',
    lat: 9.3639,
    lng: 78.8394,
    normalSlots: { total: 8, available: 4 },
    fastSlots: { total: 4, available: 4 },
  }
];

const SORTED_PREDEFINED_STATIONS = [...PREDEFINED_STATIONS].sort((a, b) => {
  const nameA = a.name.replace('Power2Go – ', '').toLowerCase();
  const nameB = b.name.replace('Power2Go – ', '').toLowerCase();
  return nameA.localeCompare(nameB);
});

export default function PowerStation() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Map Tamil Nadu coordinates dynamically onto the grid map container (width: 100%, height: 350px)
  // TN Lat range: 9.3 to 13.0
  // TN Lng range: 76.6 to 80.3
  const getGridCoords = (lat: number, lng: number) => {
    // Map Lat (13.2 -> 10% top, 9.1 -> 90% top)
    const topPercent = 10 + ((13.2 - lat) / (13.2 - 9.1)) * 80;
    // Map Lng (76.6 -> 10% left, 80.3 -> 90% left)
    const leftPercent = 10 + ((lng - 76.6) / (80.3 - 76.6)) * 80;
    return {
      top: `${Math.min(92, Math.max(8, topPercent))}%`,
      left: `${Math.min(92, Math.max(8, leftPercent))}%`
    };
  };

  // Map & Station States
  const [selectedStation, setSelectedStation] = useState<Station>(SORTED_PREDEFINED_STATIONS[0]);
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

    if (router.isReady && router.query.station) {
      const stationParam = router.query.station as string;
      const matched = PREDEFINED_STATIONS.find(s => 
        s.name.toLowerCase().includes(stationParam.toLowerCase()) ||
        s.locationName.toLowerCase().includes(stationParam.toLowerCase())
      );
      if (matched) {
        setSelectedStation(matched);
        setShowBookingForm(true);
      }
    }
  }, [router, router.isReady, router.query]);

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

      // Redirect to slot confirmation page
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
    <Layout>
      <Head>
        <title>Power2Go - Find Charging Stations</title>
      </Head>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, paddingTop: '10px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', alignItems: 'start' }}>
          
          {/* Station Selection Sidebar (Alphabetical Alignment) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '680px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
                Select Power2Go Hub
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Choose from our 19 verified charging stations.
              </p>
            </div>

            {/* Quick Search Input */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="Search station or city (e.g. Karur)..."
                onChange={(e) => {
                  const query = e.target.value.toLowerCase();
                  const matched = SORTED_PREDEFINED_STATIONS.find(s => 
                    s.name.toLowerCase().includes(query) || 
                    s.locationName.toLowerCase().includes(query)
                  );
                  if (matched) setSelectedStation(matched);
                }}
                className="glass-input"
                style={{ fontSize: '0.85rem', padding: '10px 14px' }}
              />
            </div>

            {/* Structured Alphabetical Station Cards Grid List */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              overflowY: 'auto', 
              maxHeight: '480px',
              paddingRight: '6px'
            }}>
              {SORTED_PREDEFINED_STATIONS.map((station) => {
                const isSelected = selectedStation.id === station.id;
                const cleanName = station.name.replace('Power2Go – ', '');
                return (
                  <div
                    key={station.id}
                    onClick={() => {
                      setSelectedStation(station);
                      setShowBookingForm(true);
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: isSelected ? '#eefdf4' : '#ffffff',
                      border: isSelected ? '2px solid #00aa55' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'center', width: '100%' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? '#00aa55' : '#0f172a', flex: 1 }}>
                        {station.name}
                      </strong>
                      {isSelected && (
                        <span style={{ fontSize: '0.75rem', color: '#00aa55', fontWeight: 800 }}>
                          🟢 Selected
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.3' }}>
                      {station.locationName}
                    </span>
                    
                    <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '6px', fontSize: '0.7rem' }}>
                      <span style={{ color: '#64748b' }}>
                        Normal AC: <strong style={{ color: '#0f172a' }}>{station.normalSlots.available}/{station.normalSlots.total} free</strong>
                      </span>
                      <span style={{ color: '#64748b' }}>
                        Fast DC: <strong style={{ color: '#0f172a' }}>{station.fastSlots.available}/{station.fastSlots.total} free</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    Confirm Reservation & Generate Ticket Pass
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
