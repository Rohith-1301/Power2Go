import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Power, MapPin, Battery, DollarSign, Star, Navigation, CheckCircle2, ChevronRight, LogOut, Loader } from 'lucide-react';

interface DriverStats {
  earnings: number;
  completedCount: number;
}

interface PendingBooking {
  bookingId: number;
  userName: string;
  vehicleType: string;
  chargingType: string;
  batteryPercentage: number;
  powerNeededKwh: number;
  totalAmount: number;
  location: string;
  address: string;
  remainingTime: number;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(85); // Simulated driver vehicle battery %
  const [stats, setStats] = useState<DriverStats>({ earnings: 0, completedCount: 0 });
  const [todayOrders, setTodayOrders] = useState<any[]>([]);

  // Dispatch notification state
  const [pendingRequest, setPendingRequest] = useState<PendingBooking | null>(null);
  const [countdown, setCountdown] = useState(30);

  // Active job state
  const [activeJob, setActiveJob] = useState<any>(null);
  const [jobStage, setJobStage] = useState<'accepted' | 'on_the_way' | 'arrived' | 'charging' | 'completed' | null>(null);

  // Charging input states
  const [chargePct, setChargePct] = useState(40);
  const [energyDelivered, setEnergyDelivered] = useState(0.0);
  const [chargeDuration, setChargeDuration] = useState(0);
  const [chargeCost, setChargeCost] = useState(0);

  const locationTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);

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

  // Auth checking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userData || !token) {
        router.push('/');
        return;
      }
      const parsed = JSON.parse(userData);
      if (!parsed.isDriver) {
        router.push('/');
        return;
      }
      setDriver(parsed);
      fetchDriverStats(parsed.driverId);

      // Auto-toggle to online status on mount
      fetch('/api/drivers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: parsed.driverId, status: 'online' })
      }).catch(err => console.error(err));
    }
  }, [router]);

  const fetchDriverStats = async (driverId: string) => {
    try {
      const resStats = await fetch(`/api/drivers/orders/earnings?driverId=${driverId}`);
      if (resStats.ok) {
        const data = await resStats.json();
        setStats({ earnings: data.earnings, completedCount: data.completedCount });
      }

      const resToday = await fetch(`/api/drivers/orders/today?driverId=${driverId}`);
      if (resToday.ok) {
        const data = await resToday.json();
        setTodayOrders(data.bookings);
        // Find if there is an active job in progress
        const active = data.bookings.find((b: any) => b.status !== 'completed' && b.status !== 'pending' && b.status !== 'rejected');
        if (active) {
          setActiveJob(active);
          setJobStage(active.status);
          setChargePct(active.live_battery_pct || active.battery_percentage || 40);
          setEnergyDelivered(active.live_energy_delivered || 0.0);
          setChargeDuration(active.live_duration_mins || 0);
          setChargeCost(active.total_amount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching driver stats:', err);
    }
  };

  // Status toggle handler
  const handleOnlineToggle = async () => {
    if (!driver) return;
    const nextStatus = !isOnline ? 'online' : 'offline';
    try {
      const res = await fetch('/api/drivers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.driverId, status: nextStatus })
      });
      if (res.ok) {
        setIsOnline(!isOnline);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Location GPS updates simulation
  useEffect(() => {
    if (isOnline && driver) {
      // Simulate live movement around Karur/Tamil Nadu coords
      let lat = 10.9602 + (Math.random() - 0.5) * 0.02;
      let lng = 78.0766 + (Math.random() - 0.5) * 0.02;
      
      const updateLocation = async () => {
        try {
          lat += (Math.random() - 0.5) * 0.002;
          lng += (Math.random() - 0.5) * 0.002;
          await fetch('/api/drivers/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: driver.driverId,
              lat,
              lng,
              batteryCapacity: batteryLevel
            })
          });
        } catch (err) {
          console.error(err);
        }
      };

      updateLocation();
      locationTimerRef.current = setInterval(updateLocation, 6000);
    } else {
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    }

    return () => {
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    };
  }, [isOnline, driver, batteryLevel]);

  // Polling for incoming dispatches
  useEffect(() => {
    if (isOnline && driver && !activeJob) {
      const pollPending = async () => {
        try {
          const res = await fetch(`/api/bookings/driver-pending?driverId=${driver.driverId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.pendingBooking) {
              setPendingRequest(data.pendingBooking);
              setCountdown(data.pendingBooking.remainingTime);
            } else {
              setPendingRequest(null);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      pollPending();
      pollTimerRef.current = setInterval(pollPending, 3000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setPendingRequest(null);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOnline, driver, activeJob]);

  // Countdown timer logic
  useEffect(() => {
    let timer: any;
    if (pendingRequest && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (pendingRequest && countdown === 0) {
      // Auto reject on timeout
      handleRespond('reject');
    }
    return () => clearTimeout(timer);
  }, [pendingRequest, countdown]);

  // Notifications, ringtone alert and title flashing logic when pendingRequest changes
  useEffect(() => {
    if (!pendingRequest) {
      document.title = "Power2Go - Driver Dashboard";
      return;
    }

    // 1. Request permission and trigger push notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification("Power2Go - New Dispatch Order!", {
          body: `New request from ${pendingRequest.userName} for ${pendingRequest.powerNeededKwh} kWh (₹${pendingRequest.totalAmount}).`,
          icon: '/logo.png',
          requireInteraction: true
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification("Power2Go - New Dispatch Order!", {
              body: `New request from ${pendingRequest.userName} for ${pendingRequest.powerNeededKwh} kWh (₹${pendingRequest.totalAmount}).`,
              icon: '/logo.png',
              requireInteraction: true
            });
          }
        });
      }
    }

    // 2. Trigger vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }

    // 3. Flashing title bar
    let flash = false;
    const titleInterval = setInterval(() => {
      document.title = flash ? "🚨 NEW ORDER DISPATCH 🚨" : "⚡ Power2Go Booking Alert ⚡";
      flash = !flash;
    }, 1000);

    // 4. Beep/Ringtone Alarm Audio context playback
    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5 note
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          try {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
            osc2.start();
            setTimeout(() => osc2.stop(), 250);
          } catch (e2) {}
        }, 200);
      } catch (e) {
        console.error("AudioContext alert failed:", e);
      }
    };

    // Play beep immediately and repeat every 2.5 seconds
    playBeep();
    const soundInterval = setInterval(playBeep, 2500);

    return () => {
      clearInterval(titleInterval);
      clearInterval(soundInterval);
      document.title = "Power2Go - Driver Dashboard";
    };
  }, [pendingRequest]);

  const handleRespond = async (response: 'accept' | 'reject') => {
    if (!pendingRequest || !driver) return;
    try {
      const res = await fetch('/api/bookings/driver-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: pendingRequest.bookingId,
          driverId: driver.driverId,
          response
        })
      });

      if (res.ok) {
        if (response === 'accept') {
          // Fetch updated active job details
          await fetchDriverStats(driver.driverId);
        }
        setPendingRequest(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update order stage
  const updateStage = async (nextStage: 'on_the_way' | 'arrived' | 'charging' | 'completed') => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/bookings/${activeJob.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStage,
          batteryPct: chargePct,
          energyDelivered,
          durationMins: chargeDuration,
          cost: chargeCost
        })
      });
      if (res.ok) {
        setJobStage(nextStage);
        if (nextStage === 'completed') {
          setActiveJob(null);
          setJobStage(null);
          // Refresh statistics
          fetchDriverStats(driver.driverId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Charging updates during active session
  const postChargingProgress = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/bookings/${activeJob.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'charging',
          batteryPct: chargePct,
          energyDelivered,
          durationMins: chargeDuration,
          cost: chargeCost
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!driver) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'white' }}>
        <Loader className="spin" style={{ width: '40px', height: '40px', color: 'var(--accent-green)' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'white', padding: '24px 20px' }}>
      <Head>
        <title>Power2Go - Driver Dashboard</title>
      </Head>

      {/* Header Panel */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={driver.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt="Profile" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-green)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0 }}>{driver.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Driver ID: {driver.driverId} • {driver.vehicleNumber} ({driver.vehicleType})</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Online status switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isOnline ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button
              onClick={handleOnlineToggle}
              style={{
                background: isOnline ? 'linear-gradient(135deg, #00aa55, #008855)' : '#1f2937',
                border: 'none',
                width: '50px',
                height: '26px',
                borderRadius: '13px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: isOnline ? '27px' : '3px',
                transition: 'all 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          <button onClick={handleLogout} className="glass-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem' }}>
            <LogOut style={{ width: '14px' }} /> Log Out
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: activeJob ? '1fr' : '1.5fr 1fr', gap: '24px' }}>
        
        {/* Stats and job view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Job Block */}
          {activeJob ? (
            <div className="glass-panel" style={{ padding: '32px', borderColor: 'var(--accent-green)', position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 170, 85, 0.1)', padding: '6px 12px', borderRadius: '20px', color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '16px' }}>
                <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} /> Active Booking Dispatch
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>Customer: {activeJob.user_name}</h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                    <MapPin style={{ color: 'var(--accent-red)', width: '16px' }} /> {activeJob.location ? getReadableAddress(activeJob.location) : 'N/A'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div className="metric-chip" style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>EST. ENERGY</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-green)' }}>{activeJob.power_needed_kwh || 0} kWh</strong>
                    </div>
                    <div className="metric-chip" style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>EST. PAY</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-blue)' }}>₹{activeJob.total_amount || 0}</strong>
                    </div>
                    <div className="metric-chip" style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>CHARGER</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-orange)' }}>{activeJob.charging_type}</strong>
                    </div>
                  </div>

                  {/* Stage Navigator Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {jobStage === 'accepted' && (
                      <button onClick={() => updateStage('on_the_way')} className="action-btn" style={{ background: 'linear-gradient(135deg, #0088ff, #0055ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        <Navigation style={{ width: '18px' }} /> Start Navigation (Go on the Way)
                      </button>
                    )}
                    {jobStage === 'on_the_way' && (
                      <button onClick={() => updateStage('arrived')} className="action-btn" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        📍 Arrived at Customer Location
                      </button>
                    )}
                    {jobStage === 'arrived' && (
                      <button onClick={() => updateStage('charging')} className="action-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        ⚡ Start Charging Session
                      </button>
                    )}
                    {jobStage === 'charging' && (
                      <button onClick={() => updateStage('completed')} className="action-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        <CheckCircle2 style={{ width: '18px' }} /> Complete Charging (Save & Close Job)
                      </button>
                    )}
                  </div>
                  
                  {activeJob.location && (
                    <div style={{ marginTop: '20px' }}>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${getDestinationCoords(activeJob.location)}`} target="_blank" className="glass-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
                        🗺️ Open Google Maps Navigation
                      </a>
                    </div>
                  )}
                </div>

                {/* Charging progress simulator inputs */}
                {jobStage === 'charging' && (
                  <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>Charging Live Inputs</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Battery Percentage</span>
                          <strong>{chargePct}%</strong>
                        </label>
                        <input type="range" min="0" max="100" value={chargePct} onChange={(e) => { setChargePct(parseInt(e.target.value)); postChargingProgress(); }} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Energy Delivered (kWh)</span>
                          <strong>{energyDelivered} kWh</strong>
                        </label>
                        <input type="number" step="0.1" value={energyDelivered} onChange={(e) => { setEnergyDelivered(parseFloat(e.target.value) || 0.0); postChargingProgress(); }} className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Charging Duration (Mins)</span>
                          <strong>{chargeDuration} Mins</strong>
                        </label>
                        <input type="number" value={chargeDuration} onChange={(e) => { setChargeDuration(parseInt(e.target.value) || 0); postChargingProgress(); }} className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Total Cost (INR)</span>
                          <strong>₹{chargeCost}</strong>
                        </label>
                        <input type="number" value={chargeCost} onChange={(e) => { setChargeCost(parseInt(e.target.value) || 0); postChargingProgress(); }} className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Core Stats Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(0,170,85,0.1)', padding: '12px', borderRadius: '8px' }}>
                <DollarSign style={{ color: 'var(--accent-green)', width: '24px', height: '24px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>TOTAL EARNINGS</span>
                <strong style={{ fontSize: '1.25rem' }}>₹{stats.earnings}</strong>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(0,170,85,0.1)', padding: '12px', borderRadius: '8px' }}>
                <CheckCircle2 style={{ color: 'var(--accent-green)', width: '24px', height: '24px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>COMPLETED JOBS</span>
                <strong style={{ fontSize: '1.25rem' }}>{stats.completedCount}</strong>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(0,170,85,0.1)', padding: '12px', borderRadius: '8px' }}>
                <Star style={{ color: 'var(--accent-green)', width: '24px', height: '24px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>CUSTOMER RATING</span>
                <strong style={{ fontSize: '1.25rem' }}>4.8 ★</strong>
              </div>
            </div>
          </div>

          {/* Today's Orders list */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 16px 0' }}>Today's Orders</h3>
            {todayOrders.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No orders assigned today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todayOrders.map((ord: any) => (
                  <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{ord.user_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type: {ord.charging_type} • Status: <span style={{ textTransform: 'capitalize', color: ord.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-blue)' }}>{ord.status}</span></span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem' }}>₹{ord.total_amount}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(ord.booking_time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar controls */}
        {!activeJob ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Vehicle Battery & Location simulator controller */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 16px 0' }}>Simulated Settings</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <span>Charging Vehicle Battery Level</span>
                    <strong>{batteryLevel}%</strong>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Battery style={{ color: batteryLevel > 30 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                    <input type="range" min="10" max="100" value={batteryLevel} onChange={(e) => setBatteryLevel(parseInt(e.target.value))} style={{ flex: 1 }} />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>LIVE GPS TRANSMISSION</span>
                  {isOnline ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} /> Simulating GPS tracking
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Offline. GPS updates suspended.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* DISPATCH POPUP NOTIFICATION MODAL */}
      {pendingRequest && (
        <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(3, 7, 18, 0.85)', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '36px', borderColor: 'var(--accent-green)', boxShadow: '0 10px 40px rgba(0, 200, 87, 0.15)', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 170, 85, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Navigation className="spin" style={{ color: 'var(--accent-green)', width: '28px', height: '28px' }} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 4px 0' }}>New Dispatch Request!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>Accept within the next 30 seconds</p>

            {/* Countdown Visualizer */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: countdown > 10 ? 'var(--accent-green)' : 'var(--accent-red)', width: `${(countdown / 30) * 100}%`, transition: 'width 1s linear' }} />
            </div>

            {/* Job Details Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'left', marginBottom: '30px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '8px' }}>👤 <b>Customer:</b> {pendingRequest.userName}</div>
              <div style={{ marginBottom: '8px' }}>🚗 <b>Vehicle Type:</b> {pendingRequest.vehicleType}</div>
              <div style={{ marginBottom: '8px' }}>⚡ <b>Charging Mode:</b> {pendingRequest.chargingType}</div>
              <div style={{ marginBottom: '8px' }}>🔋 <b>Current Charge:</b> {pendingRequest.batteryPercentage}%</div>
              <div style={{ marginBottom: '8px' }}>🔌 <b>Est. Demand:</b> {pendingRequest.powerNeededKwh} kWh</div>
              <div style={{ marginBottom: '8px' }}>💰 <b>Est. Earnings:</b> ₹{pendingRequest.totalAmount}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                📍 <span style={{ color: 'var(--accent-blue)' }}><b>Address:</b> {pendingRequest.address}</span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button onClick={() => handleRespond('reject')} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                Decline
              </button>
              <button onClick={() => handleRespond('accept')} style={{ padding: '12px', background: 'linear-gradient(135deg, #00aa55, #008855)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                Accept Job ({countdown}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
