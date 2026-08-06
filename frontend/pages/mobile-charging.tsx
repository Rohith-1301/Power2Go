import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Bike, Car, Truck, MapPin, CheckCircle, Smartphone, HelpCircle, QrCode, ShieldCheck, Loader, Star } from 'lucide-react';


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

  // Active tracking states
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [activeDriver, setActiveDriver] = useState<any>(null);
  const [completedBookingId, setCompletedBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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

    if (router.isReady && router.query.location) {
      setLocationAddress(router.query.location as string);
      setLocationShared(true);
      setDistance(8.4); // mock distance for dispatch from nearest hub
    }
  }, [router, router.isReady, router.query]);

  useEffect(() => {
    if (!user) return;
    const fetchActiveBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/active?username=${encodeURIComponent(user.name)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.activeBooking) {
            setActiveBooking(data.activeBooking);
            setActiveDriver(data.driver);
            setCompletedBookingId(data.activeBooking.id);
          } else {
            // Trigger feedback dialog if booking completes
            if (activeBooking) {
              setActiveBooking(null);
              setActiveDriver(null);
              setShowFeedbackModal(true);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchActiveBooking();
    const interval = setInterval(fetchActiveBooking, 3000);
    return () => clearInterval(interval);
  }, [user, activeBooking]);

  const submitRating = async () => {
    if (!completedBookingId) return;
    try {
      const res = await fetch(`/api/bookings/${completedBookingId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedbackText }),
      });
      if (res.ok) {
        setCompletedBookingId(null);
        setShowFeedbackModal(false);
        setRating(5);
        setFeedbackText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDestinationCoords = (locationStr: string): string => {
    if (!locationStr) return '';
    const regex1 = /Lat:\s*(-?\d+\.\d+).*Lng:\s*(-?\d+\.\d+)/i;
    const match1 = locationStr.match(regex1);
    if (match1) {
      return `${match1[1]},${match1[2]}`;
    }
    const regex2 = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match2 = locationStr.match(regex2);
    if (match2) {
      return `${match2[1]},${match2[2]}`;
    }
    return locationStr;
  };

  const getReadableAddress = (locationStr: string): string => {
    if (!locationStr) return 'Unknown Location';
    let lat = 0, lng = 0, found = false;
    const regex1 = /Lat:\s*(-?\d+\.\d+).*Lng:\s*(-?\d+\.\d+)/i;
    const match1 = locationStr.match(regex1);
    if (match1) {
      lat = parseFloat(match1[1]);
      lng = parseFloat(match1[2]);
      found = true;
    } else {
      const regex2 = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
      const match2 = locationStr.match(regex2);
      if (match2) {
        lat = parseFloat(match2[1]);
        lng = parseFloat(match2[2]);
        found = true;
      }
    }

    if (found) {
      if (Math.abs(lat - 10.9602) < 0.05 && Math.abs(lng - 78.0766) < 0.05) {
        return 'Near Karur Bus Stand, Karur';
      }
      if (Math.abs(lat - 10.9392) < 0.05 && Math.abs(lng - 78.4147) < 0.05) {
        return 'Near Bus Stand, Kulithalai';
      }
      if (Math.abs(lat - 9.9322) < 0.05 && Math.abs(lng - 78.1561) < 0.05) {
        return 'Near Mattuthavani Bus Stand, Madurai';
      }
      if (Math.abs(lat - 12.9915) < 0.05 && Math.abs(lng - 80.2173) < 0.05) {
        return 'Near Phoenix Marketcity, Velachery, Chennai';
      }
      if (Math.abs(lat - 10.8056) < 0.05 && Math.abs(lng - 78.6856) < 0.05) {
        return 'Near Central Bus Stand, Trichy';
      }
      if (Math.abs(lat - 11.6643) < 0.05 && Math.abs(lng - 78.1460) < 0.05) {
        return 'Near NH-44 Salem Bypass Crossing, Salem';
      }
      return `Area coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
    return locationStr;
  };

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
      // Redirect back to booking page for real-time en-route tracking
      router.push('/mobile-charging');
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
        
        {activeBooking && activeBooking.service_type === 'Mobile Charging' && activeBooking.status !== 'pending' ? (
          /* Render Active Route Tracking Panel inside the Booking Page */
          <div className="glass-panel" style={{ padding: '30px', border: '1px solid var(--accent-green)', boxShadow: '0 0 20px rgba(0, 255, 135, 0.1)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div>
                <span className="pulse-dot" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '8px' }} />
                <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>
                  Express Delivery Active
                </strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Booking ID: #{activeBooking.id} • Assigned: {activeDriver ? 'Yes' : 'Finding Driver...'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '30px' }}>
              <div style={{ flex: '1 1 300px' }}>
                {/* Status progress bar */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span style={{ color: activeBooking.status === 'pending' ? 'var(--accent-blue)' : 'inherit' }}>Searching</span>
                    <span style={{ color: activeBooking.status === 'accepted' ? 'var(--accent-blue)' : 'inherit' }}>Accepted</span>
                    <span style={{ color: activeBooking.status === 'on_the_way' ? 'var(--accent-blue)' : 'inherit' }}>On the Way</span>
                    <span style={{ color: activeBooking.status === 'arrived' ? 'var(--accent-blue)' : 'inherit' }}>Arrived</span>
                    <span style={{ color: activeBooking.status === 'charging' ? 'var(--accent-blue)' : 'inherit' }}>Charging</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'var(--accent-green)',
                      width: activeBooking.status === 'pending' ? '15%' :
                             activeBooking.status === 'accepted' ? '35%' :
                             activeBooking.status === 'on_the_way' ? '55%' :
                             activeBooking.status === 'arrived' ? '75%' :
                             activeBooking.status === 'charging' ? '90%' : '100%',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Driver Profile */}
                {activeDriver ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <img src={activeDriver.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt="Driver Profile" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '1rem' }}>Driver: {activeDriver.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Vehicle: {activeDriver.vehicle_number} ({activeDriver.vehicle_type})</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>📞 {activeDriver.mobile}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>ETA</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                        {activeBooking.status === 'on_the_way' ? '7-12 Mins' : activeBooking.status === 'arrived' ? 'Arrived' : activeBooking.status === 'charging' ? 'In Progress' : '5 Mins'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px dashed rgba(255,255,255,0.08)', justifyContent: 'center' }}>
                    <Loader className="spin" style={{ color: 'var(--accent-blue)', width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Matching closest charging vehicle... Please hold on.</span>
                  </div>
                )}

                {/* Live progress stats during charging */}
                {activeBooking.status === 'charging' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'rgba(0,255,135,0.04)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,255,135,0.1)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>BATTERY</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-green)' }}>{activeBooking.live_battery_pct || 0}%</strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>ENERGY</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-green)' }}>{activeBooking.live_energy_delivered || 0} kWh</strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>DURATION</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-green)' }}>{activeBooking.live_duration_mins || 0} Mins</strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>CURRENT COST</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-blue)' }}>₹{activeBooking.total_amount || 0}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Live route tracking map */}
              <div style={{ flex: '1 1 300px', height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                {activeDriver && activeBooking.location ? (
                  <iframe
                    src={`https://www.google.com/maps?saddr=${activeDriver.lat},${activeDriver.lng}&daddr=${getDestinationCoords(activeBooking.location)}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#0e1227', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Map becomes active when driver is assigned
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            
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
          </>
        )}
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
                    Confirm Order & Start GPS Tracking
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK & RATING MODAL */}
      {showFeedbackModal && (
        <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(3, 7, 18, 0.85)', zIndex: 99999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '36px', borderColor: 'var(--accent-green)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 6px 0' }}>Charging Session Completed!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Please submit your feedback to help us improve driver service quality.</p>

            {/* Star Rating Inputs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <Star style={{ width: '32px', height: '32px', fill: star <= rating ? 'var(--accent-green)' : 'none', color: star <= rating ? 'var(--accent-green)' : 'var(--text-secondary)' }} />
                </button>
              ))}
            </div>

            {/* Feedback text */}
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your experience (Optional)..."
              className="glass-input"
              style={{ width: '100%', height: '100px', minHeight: '80px', marginBottom: '24px', padding: '12px', fontSize: '0.85rem', color: 'white', resize: 'vertical' }}
            />

            <button onClick={submitRating} className="action-btn" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00aa55, #008855)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
              Submit Feedback & Ratings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
