import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, ArrowRight, Zap, Clock, MapPin, Smartphone, Truck, ShieldAlert, Star, MessageSquare, QrCode, ShieldCheck, Loader } from 'lucide-react';

interface BookingDetails {
  serviceType: string;
  vehicleType: string;
  chargingType: string;
  totalAmount: number;
  location?: string;
  stationName?: string;
  delayMinutes?: number;
  selectedServices?: any[];
}

export default function ThankYou() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [userMobile, setUserMobile] = useState<string>('9876543210');
  const [showNotification, setShowNotification] = useState(true);
  
  // Tracking states
  const [trackingProgress, setTrackingProgress] = useState(0); // 0 to 100
  const [trackingStep, setTrackingStep] = useState<'confirmed' | 'dispatched' | 'enroute' | 'arrived'>('confirmed');
  const [eta, setEta] = useState(15); // minutes
  const [activeDriver, setActiveDriver] = useState<any>(null);

  // Feedback states (embedded for post-arrival checkout)
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // WhatsApp Sender
  const sendWhatsAppMessage = (mobileNum: string, activeBooking?: any) => {
    const currentBooking = activeBooking || booking;
    let message = '';
    if (currentBooking && currentBooking.serviceType === 'Station Pre-booking') {
      message = `Power2Go Hub Reservation: Dear Customer, your slot at ${currentBooking.stationName || 'Hub'} is confirmed! Please reach within ${currentBooking.delayMinutes || 20} mins. View ticket pass: http://localhost:3000/thankyou`;
    } else {
      message = `Power2Go: Dear Customer, your EV charging order is confirmed! Track the live en-route movement of our dispatched charging vehicle: http://localhost:3000/thankyou`;
    }
    // Open WhatsApp send API to transmit from company WA logged in on this browser (9600777947) to customer (8903381167)
    window.open(`https://api.whatsapp.com/send?phone=91${mobileNum}&text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    const lastBooking = localStorage.getItem('last_booking');
    let localBooking = null;
    if (lastBooking) {
      localBooking = JSON.parse(lastBooking);
      setBooking(localBooking);
    }

    // Default customer number is 8903381167 as requested
    let mobile = '8903381167';
    let customerName = '';
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      customerName = parsed.name;
      if (parsed.registerNumber && parsed.registerNumber !== 'N/A') {
        mobile = parsed.registerNumber;
      }
    }
    setUserMobile(mobile);

    // Do not auto-send WhatsApp message or show WhatsApp notification panel
    setShowNotification(false);

    let pollInterval: NodeJS.Timeout | null = null;
    if (customerName && localBooking && localBooking.serviceType !== 'Station Pre-booking') {
      const fetchRealStatus = async () => {
        try {
          const res = await fetch(`/api/bookings/active?username=${encodeURIComponent(customerName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.activeBooking) {
              const status = data.activeBooking.status;
              if (status === 'pending') {
                setTrackingProgress(5);
                setTrackingStep('confirmed');
                setEta(15);
              } else if (status === 'accepted') {
                setTrackingProgress(25);
                setTrackingStep('dispatched');
                setEta(12);
              } else if (status === 'on_the_way') {
                setTrackingProgress(60);
                setTrackingStep('enroute');
                setEta(8);
              } else if (status === 'arrived') {
                setTrackingProgress(85);
                setTrackingStep('arrived');
                setEta(2);
              } else if (status === 'charging') {
                setTrackingProgress(95);
                setTrackingStep('arrived');
                setEta(0);
              }

              if (data.driver) {
                setActiveDriver(data.driver);
              } else {
                setActiveDriver(null);
              }
            } else {
              // No active booking means it's completed!
              setTrackingProgress(100);
              setTrackingStep('arrived');
              setEta(0);
              setShowFeedback(true);
              setActiveDriver(null);
              if (pollInterval) clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchRealStatus();
      pollInterval = setInterval(fetchRealStatus, 3000);
    } else if (localBooking && localBooking.serviceType === 'Station Pre-booking') {
      setShowFeedback(true);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);
    const userData = localStorage.getItem('user');
    const userName = userData ? JSON.parse(userData).name : 'Anonymous';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          rating,
          comments,
        }),
      });

      if (res.ok) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setShowFeedback(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '40px 20px', flexDirection: 'column' }}>
      <Head>
        <title>Power2Go - Live Order Tracker</title>
      </Head>

      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        


        {/* Live Tracker Main Panel */}
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          
          {/* Header circular logo badge */}
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #00aa55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px auto',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 170, 85, 0.15)'
          }}>
            <img 
              src="/logo.png" 
              alt="Power2Go Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover'
              }} 
            />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00aa55', marginBottom: '6px' }}>
            {booking?.serviceType === 'Station Pre-booking' 
              ? 'Slot Reserved Successfully!' 
              : (trackingStep === 'arrived' ? 'Order Arrived!' : 'Electricity Dispatched!')}
          </h2>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '20px' }}>
            {booking?.serviceType === 'Station Pre-booking' 
              ? `Your slot reservation is locked. Please scan reservation pass at hub entrance.`
              : (trackingStep === 'arrived' ? 'The charging van is here and refueling your battery.' : 'Our mobile power specialist is en-route to deliver charge.')}
          </p>

          {booking?.serviceType === 'Station Pre-booking' ? (
            /* Ticket reservation details for station pre-bookings */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
              <div className="glass-panel" style={{
                background: '#eefdf4',
                border: '2px dashed #00aa55',
                padding: '30px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 170, 85, 0.05)'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                  Hub Reservation Ticket
                </span>
                
                {/* Station QR Code pass */}
                <div style={{
                  background: '#fff',
                  padding: '15px',
                  borderRadius: '12px',
                  width: '150px',
                  height: '150px',
                  margin: '0 auto 15px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#000' }} />
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {booking.stationName}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>
                  Arrival Hold: Within {booking.delayMinutes} Mins
                </p>
                
                <div style={{ 
                  marginTop: '20px', 
                  borderTop: '1px dashed #cbd5e1', 
                  paddingTop: '15px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.8rem',
                  color: '#64748b'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <span>Hold Deposit paid:</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>₹{booking.totalAmount.toFixed(2)}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span>Vehicle Type:</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem', marginTop: '2px', textTransform: 'capitalize' }}>{booking.vehicleType}</strong>
                  </div>
                </div>

                {booking.selectedServices && booking.selectedServices.length > 0 && (
                  <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', textAlign: 'left', fontSize: '0.8rem' }}>
                    <span style={{ color: '#475569', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Booked EV Services:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {booking.selectedServices.map((service: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: '0.78rem' }}>
                          <span>{service.name}</span>
                          <strong>{service.price > 0 ? `₹${service.price}` : 'Store Add-on'}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#1e3a8a',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldCheck style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span>Show this QR code ticket at the entrance terminal. Your reserved slot is locked for your plate number.</span>
              </div>
            </div>
          ) : (
            /* Live Tracking Map, Stepper Timeline, and Delivery Partner Card for Mobile/SOS Dispatch */
            <>
              {/* Interactive Delivery Tracker Map */}
              <div style={{
                background: '#f1f5f9',
                height: '300px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                {activeDriver && booking?.location ? (
                  <iframe
                    src={`https://www.google.com/maps?saddr=${activeDriver.lat},${activeDriver.lng}&daddr=${getDestinationCoords(booking.location)}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#64748b', gap: '12px' }}>
                    <Loader className="spin" style={{ color: '#00aa55', width: '24px', height: '24px' }} />
                    <span>Map becomes active when driver is assigned</span>
                  </div>
                )}
                
                {/* Live Progress HUD overlay */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #334155',
                  fontSize: '0.8rem',
                  color: '#ffffff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 10
                }}>
                  <Clock style={{ width: '12px', color: '#f59e0b' }} />
                  <span>ETA: {eta} mins ({trackingProgress}%)</span>
                </div>
              </div>

              {/* Swiggy Style Stepper Tracker Progress timeline */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '15px' }}>
                  Electricity Delivery Status
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[
                    { label: 'Order Confirmed', desc: 'UPI payment cleared & request processed', checked: true },
                    { label: 'Power Van Dispatched', desc: 'Refueling Agent Ramesh assigned to en-route', checked: trackingProgress > 20 },
                    { label: 'Live Tracking Active', desc: 'Van travelling to coordinates', checked: trackingProgress > 70 },
                    { label: 'Delivered & Connected', desc: 'Plugged in & active fast charging', checked: trackingProgress === 100 }
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: step.checked ? '#00aa55' : '#e2e8f0',
                          border: step.checked ? 'none' : '1px solid #cbd5e1',
                          boxShadow: step.checked ? '0 0 8px rgba(0, 170, 85, 0.25)' : 'none',
                          transition: 'all 0.3s ease'
                        }}></div>
                        {idx !== 3 && <div style={{ width: '2px', height: '24px', background: step.checked ? '#00aa55' : '#cbd5e1' }}></div>}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: step.checked ? '#0f172a' : '#64748b' }}>{step.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Partner Profile Card */}
              {activeDriver ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  marginBottom: '25px'
                }}>
                  <img src={activeDriver.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt="Driver Profile" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Driver: {activeDriver.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>Mobile Charging Specialist • <span style={{ color: '#00aa55', fontWeight: 'bold' }}>📞 {activeDriver.mobile}</span></div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Vehicle: {activeDriver.vehicle_number} ({activeDriver.vehicle_type})</div>
                  </div>
                  <div style={{
                    background: '#eefdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    color: '#00aa55',
                    fontWeight: 600
                  }}>
                    Assigned
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  marginBottom: '25px',
                  justifyContent: 'center'
                }}>
                  <Loader className="spin" style={{ color: '#00aa55', width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Matching closest charging vehicle... Please hold on.</span>
                </div>
              )}
            </>
          )}

          {/* Embedded Feedback Form (Appears once vehicle Arrives) */}
          {showFeedback && (
            <div className="glass-panel" style={{
              padding: '24px',
              borderColor: 'var(--accent-orange)',
              background: 'rgba(255, 159, 0, 0.03)',
              marginBottom: '25px',
              textAlign: 'left',
              boxShadow: '0 0 15px rgba(255, 159, 0, 0.25)'
            }}>
              {!feedbackSuccess ? (
                <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-orange)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                    Rate Your Delivery Experience
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          onClick={() => setRating(star)}
                          style={{
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            fill: rating >= star ? 'var(--accent-orange)' : 'transparent',
                            color: rating >= star ? 'var(--accent-orange)' : 'var(--text-muted)'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Any queries or feedback comments?
                    </label>
                    <textarea
                      className="glass-input"
                      style={{ minHeight: '60px', padding: '10px', fontSize: '0.85rem' }}
                      placeholder="Comment box..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={feedbackLoading} className="glass-button" style={{
                    padding: '10px',
                    fontSize: '0.85rem',
                    background: 'linear-gradient(135deg, var(--accent-orange) 0%, #d47a00 100%)',
                    boxShadow: '0 4px 15px rgba(255, 159, 0, 0.2)'
                  }}>
                    {feedbackLoading ? 'Submitting...' : 'Submit Delivery Feedback'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle style={{ color: 'var(--accent-green)', width: '32px', height: '32px', margin: '0 auto 10px auto' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Feedback submitted successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* Return to Dashboard */}
          <button
            onClick={() => {
              localStorage.removeItem('last_booking');
              router.push('/dashboard');
            }}
            className="glass-button secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Return to Dashboard
            <ArrowRight style={{ width: '16px' }} />
          </button>

        </div>
      </div>
    </div>
  );
}
