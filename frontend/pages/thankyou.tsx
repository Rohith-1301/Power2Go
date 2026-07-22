import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, ArrowRight, Zap, Clock, MapPin, Smartphone, Truck, ShieldAlert, Star, MessageSquare, QrCode, ShieldCheck } from 'lucide-react';

interface BookingDetails {
  serviceType: string;
  vehicleType: string;
  chargingType: string;
  totalAmount: number;
  location?: string;
  stationName?: string;
  delayMinutes?: number;
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
    let activeBooking = null;
    if (lastBooking) {
      activeBooking = JSON.parse(lastBooking);
      setBooking(activeBooking);
    }

    // Default customer number is 8903381167 as requested
    let mobile = '8903381167';
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed.registerNumber && parsed.registerNumber !== 'N/A') {
        mobile = parsed.registerNumber;
      }
    }
    setUserMobile(mobile);

    // Auto-send WhatsApp message once on load for this booking
    if (activeBooking) {
      const hasSent = sessionStorage.getItem('whatsapp_sent_for_booking');
      if (!hasSent) {
        sessionStorage.setItem('whatsapp_sent_for_booking', 'true');
        sendWhatsAppMessage(mobile, activeBooking);
      }
    }

    // Dismiss WhatsApp panel after 1 minute (60 seconds)
    const notifyTimeout = setTimeout(() => {
      setShowNotification(false);
    }, 60000);

    let interval: NodeJS.Timeout | null = null;
    if (activeBooking && activeBooking.serviceType !== 'Station Pre-booking') {
      // Live Tracking Animation emulation (en-route vehicle)
      interval = setInterval(() => {
        setTrackingProgress((prev) => {
          const next = prev + 1;
          if (next >= 100) {
            if (interval) clearInterval(interval);
            setTrackingStep('arrived');
            setEta(0);
            setShowFeedback(true); // Open feedback widget once arrived
            return 100;
          }
          
          // Update states based on progress
          if (next > 70) {
            setTrackingStep('enroute');
            setEta(2);
          } else if (next > 20) {
            setTrackingStep('dispatched');
            setEta(8);
          } else {
            setTrackingStep('confirmed');
            setEta(13);
          }
          return next;
        });
      }, 400); // animates to 100% in about 40 seconds
    } else if (activeBooking && activeBooking.serviceType === 'Station Pre-booking') {
      setShowFeedback(true);
    }

    return () => {
      if (interval) clearInterval(interval);
      clearTimeout(notifyTimeout);
    };
  }, []);

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
        
        {/* Real WhatsApp Dispatcher Panel */}
        {showNotification && (
          <div style={{
            background: 'rgba(18, 20, 32, 0.95)',
            border: '1px solid #25D366',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(37, 211, 102, 0.25)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#25D366', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }}></span>
                WhatsApp Notification Ticket Panel
              </span>
              <button onClick={() => setShowNotification(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#fff', lineHeight: 1.5 }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>From Company Number:</span>
                <strong>+91 9600777947 (Power2Go Registered)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>To Customer Number:</span>
                <strong>+91 {userMobile}</strong>
              </div>
              <div style={{ borderLeft: '3px solid #25D366', paddingLeft: '12px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px' }}>
                <strong>Message:</strong> "{booking?.serviceType === 'Station Pre-booking' 
                  ? `Power2Go Hub Reservation: Dear Customer, your slot at ${booking?.stationName || 'Hub'} is confirmed! Please reach within ${booking?.delayMinutes || 20} mins. View ticket pass: http://localhost:3000/thankyou`
                  : `Power2Go: Dear Customer, your order is confirmed! Track the live en-route movement of our dispatched charging vehicle: http://localhost:3000/thankyou`}"
              </div>
              
              <button
                onClick={() => sendWhatsAppMessage(userMobile)}
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  marginTop: '5px'
                }}
              >
                💬 Send / Resend WhatsApp Message
              </button>
            </div>
          </div>
        )}

        {/* Live Tracker Main Panel */}
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
          
          {/* Header circular logo badge */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px auto',
            overflow: 'hidden',
            boxShadow: '0 0 15px var(--accent-blue-glow)',
            padding: '5px'
          }}>
            <img 
              src="/logo.png" 
              alt="Power2Go Logo" 
              style={{ 
                maxWidth: '90%', 
                maxHeight: '90%', 
                objectFit: 'contain'
              }} 
            />
          </div>

          <h2 className="gradient-text-green" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>
            {booking?.serviceType === 'Station Pre-booking' 
              ? 'Slot Reserved Successfully!' 
              : (trackingStep === 'arrived' ? 'Order Arrived!' : 'Electricity Dispatched!')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
            {booking?.serviceType === 'Station Pre-booking' 
              ? `Your slot reservation is locked. Please scan reservation pass at hub entrance.`
              : (trackingStep === 'arrived' ? 'The charging van is here and refueling your battery.' : 'Our mobile power specialist is en-route to deliver charge.')}
          </p>

          {booking?.serviceType === 'Station Pre-booking' ? (
            /* Ticket reservation details for station pre-bookings */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
              <div className="glass-panel" style={{
                background: 'rgba(0, 255, 135, 0.03)',
                border: '2px dashed var(--accent-green)',
                padding: '30px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 0 20px rgba(0, 255, 135, 0.1)'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
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
                  boxShadow: '0 0 15px rgba(255,255,255,0.05)'
                }}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#000' }} />
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {booking.stationName}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                  Arrival Hold: Within {booking.delayMinutes} Mins
                </p>
                
                <div style={{ 
                  marginTop: '20px', 
                  borderTop: '1px dashed var(--border-glass)', 
                  paddingTop: '15px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <span>Hold Deposit paid:</span>
                    <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem', marginTop: '2px' }}>₹{booking.totalAmount.toFixed(2)}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span>Vehicle Type:</span>
                    <strong style={{ display: 'block', color: '#fff', fontSize: '0.95rem', marginTop: '2px', textTransform: 'capitalize' }}>{booking.vehicleType}</strong>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(0, 210, 255, 0.05)',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldCheck style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                <span>Show this QR code ticket at the entrance terminal. Your reserved slot is locked for your plate number.</span>
              </div>
            </div>
          ) : (
            /* Live Tracking Map, Stepper Timeline, and Delivery Partner Card for Mobile/SOS Dispatch */
            <>
              {/* Interactive Delivery Tracker Map */}
              <div style={{
                background: '#090a0f',
                height: '220px',
                borderRadius: '12px',
                border: '1px solid var(--border-glass)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '20px',
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}>
                {/* Map Labels */}
                <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <MapPin style={{ width: '12px', color: 'var(--accent-red)' }} />
                  <span>Dispatch Station</span>
                </div>
                
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <MapPin style={{ width: '12px', color: 'var(--accent-green)' }} />
                  <span>Your Vehicle Location</span>
                </div>

                {/* Path Drawing */}
                <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
                  {/* Dotted Route path */}
                  <path 
                    d="M 60,60 C 150,40 220,180 340,160" 
                    fill="none" 
                    stroke="rgba(0, 210, 255, 0.15)" 
                    strokeWidth="4" 
                  />
                  <path 
                    d="M 60,60 C 150,40 220,180 340,160" 
                    fill="none" 
                    stroke="var(--accent-blue)" 
                    strokeWidth="3" 
                    strokeDasharray="6,6"
                  />
                  
                  {/* Hub Node */}
                  <circle cx="60" cy="60" r="8" fill="var(--accent-red)" />
                  <circle cx="60" cy="60" r="16" fill="none" stroke="var(--accent-red)" strokeWidth="1" opacity="0.4" />
                  
                  {/* User Node */}
                  <circle cx="340" cy="160" r="8" fill="var(--accent-green)" />
                  <circle cx="340" cy="160" r="16" fill="none" stroke="var(--accent-green)" strokeWidth="1" opacity="0.4" />
                </svg>

                {/* Animating Dispatch Delivery Truck Icon */}
                {(() => {
                  const t = trackingProgress / 100;
                  const x = Math.round((1 - t) * (1 - t) * 60 + 2 * (1 - t) * t * 180 + t * t * 340);
                  const y = Math.round((1 - t) * (1 - t) * 60 + 2 * (1 - t) * t * 130 + t * t * 160);

                  return (
                    <div style={{
                      position: 'absolute',
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                      background: 'var(--accent-blue)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 15px var(--accent-blue)',
                      zIndex: 20,
                      transition: 'left 0.1s linear, top 0.1s linear'
                    }}>
                      <Truck style={{ width: '18px', color: '#000' }} />
                    </div>
                  );
                })()}
                
                {/* Live Progress HUD overlay */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-glass)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Clock style={{ width: '12px', color: 'var(--accent-orange)' }} />
                  <span>ETA: {eta} mins ({trackingProgress}%)</span>
                </div>
              </div>

              {/* Swiggy Style Stepper Tracker Progress timeline */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '15px' }}>
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
                          background: step.checked ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
                          border: step.checked ? 'none' : '1px solid var(--border-glass)',
                          boxShadow: step.checked ? '0 0 8px var(--accent-green-glow)' : 'none',
                          transition: 'all 0.3s ease'
                        }}></div>
                        {idx !== 3 && <div style={{ width: '2px', height: '24px', background: step.checked ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)' }}></div>}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: step.checked ? '#fff' : 'var(--text-muted)' }}>{step.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Partner Profile Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'left',
                marginBottom: '25px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px var(--accent-blue-glow)'
                }}>
                  <Truck style={{ width: '24px', color: '#000' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Ramesh Kumar</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mobile Charging Specialist</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '2px' }}>Vehicle: Power Truck (TN-47-EX-1208)</div>
                </div>
                <div style={{
                  background: 'rgba(0, 255, 135, 0.1)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-green)',
                  fontWeight: 600
                }}>
                  Grid Container: Full
                </div>
              </div>
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
