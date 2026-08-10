import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Loader, Star, AlertTriangle, ShieldCheck, ShieldAlert, Truck, Wrench, CheckCircle, QrCode, Camera, Navigation, Zap, MessageSquare, MapPin, Bot } from 'lucide-react';
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

export default function RoadsideRepair() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // States
  const [repairVehicleType, setRepairVehicleType] = useState<'motorcycle' | 'car' | 'heavy'>('car');
  const [repairVehicleNumber, setRepairVehicleNumber] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairPhoto, setRepairPhoto] = useState<string | null>(null);
  const [repairLocation, setRepairLocation] = useState('Lat: 10.9602, Lng: 78.0766 (Karur Center)');
  
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [repairOption, setRepairOption] = useState<'none' | 'mechanic' | 'take_to_station'>('none');
  const [activeRepair, setActiveRepair] = useState<any>(null);
  const [activeMechanic, setActiveMechanic] = useState<any>(null);
  const [activeTowDriver, setActiveTowDriver] = useState<any>(null);
  const [repairLoading, setRepairLoading] = useState(false);

  // Ratings feedback states
  const [showRepairFeedback, setShowRepairFeedback] = useState(false);
  const [ratingMechanic, setRatingMechanic] = useState(5);
  const [ratingRepair, setRatingRepair] = useState(5);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [repairFeedbackText, setRepairFeedbackText] = useState('');

  // UPI payment states
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiAmount, setUpiAmount] = useState(0);
  const [upiStep, setUpiStep] = useState<'select' | 'processing' | 'success'>('select');
  const [upiCallback, setUpiCallback] = useState<() => void>(() => {});

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Poll active repair request status
  useEffect(() => {
    if (!user) return;
    const fetchActiveRepair = async () => {
      try {
        const res = await fetch(`/api/repairs/active?username=${encodeURIComponent(user.name)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.activeRepair) {
            setActiveRepair(data.activeRepair);
            setActiveMechanic(data.mechanic);
            setActiveTowDriver(data.towDriver);
            setRepairOption(data.activeRepair.service_option === 'book_mechanic' ? 'mechanic' : 'take_to_station');
          } else {
            setActiveRepair(null);
            setActiveMechanic(null);
            setActiveTowDriver(null);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActiveRepair();
    const interval = setInterval(fetchActiveRepair, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const shareLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setRepairLocation('Retrieving GPS location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setRepairLocation(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
      },
      (error) => {
        console.error(error);
        setRepairLocation('Lat: 10.9602, Lng: 78.0766 (Karur Center - Mock Precision)');
      },
      { enableHighAccuracy: true }
    );
  };

  const runAIDiagnosis = async () => {
    if (!repairDescription.trim()) {
      alert('Please describe the problem.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/repairs/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: repairDescription,
          vehicleType: repairVehicleType,
          vehicleNumber: repairVehicleNumber
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const bookRoadsideMechanic = async () => {
    if (!user) return;
    setRepairLoading(true);
    try {
      const reqRes = await fetch('/api/repairs/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.name,
          vehicleType: repairVehicleType,
          vehicleNumber: repairVehicleNumber,
          description: repairDescription,
          photoUrl: repairPhoto,
          location: repairLocation,
          aiDiagnosisResult: aiReport,
          serviceOption: 'book_mechanic'
        })
      });
      
      if (reqRes.ok) {
        setRepairOption('mechanic');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRepairLoading(false);
    }
  };

  const selectTakeToStation = async (station: any, recovery: boolean) => {
    if (!user) return;
    setRepairLoading(true);
    try {
      const reqRes = await fetch('/api/repairs/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.name,
          vehicleType: repairVehicleType,
          vehicleNumber: repairVehicleNumber,
          description: repairDescription,
          photoUrl: repairPhoto,
          location: repairLocation,
          aiDiagnosisResult: aiReport,
          serviceOption: 'take_to_station'
        })
      });

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        
        if (recovery) {
          await fetch(`/api/repairs/${reqData.requestId}/request-recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationName: station.name })
          });
        } else {
          await fetch(`/api/repairs/${reqData.requestId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'station_assigned', serviceOption: 'take_to_station', stationName: station.name })
          });
        }
        setRepairOption('take_to_station');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRepairLoading(false);
    }
  };

  const requestTowingRecovery = async () => {
    if (!activeRepair) return;
    try {
      await fetch(`/api/repairs/${activeRepair.id}/request-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationName: PREDEFINED_STATIONS[4].name })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const approveRepairEstimate = async (approve: boolean) => {
    if (!activeRepair) return;
    try {
      await fetch(`/api/repairs/${activeRepair.id}/estimate/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const payRepairInvoice = () => {
    if (!activeRepair) return;
    const estTotal = activeRepair.estimate_labor + activeRepair.estimate_parts + activeRepair.estimate_diagnostics + activeRepair.estimate_other;
    setUpiAmount(estTotal);
    setUpiCallback(() => async () => {
      try {
        await fetch(`/api/repairs/${activeRepair.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'online' })
        });
        await fetch(`/api/repairs/${activeRepair.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        setShowRepairFeedback(true);
      } catch (err) {
        console.error(err);
      }
    });
    setShowUPIModal(true);
    setUpiStep('select');
  };

  const submitRepairFeedback = async () => {
    if (!activeRepair) return;
    try {
      const res = await fetch(`/api/repairs/${activeRepair.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratingMechanic,
          ratingRepair,
          ratingOverall,
          feedback: repairFeedbackText
        })
      });
      if (res.ok) {
        setShowRepairFeedback(false);
        setAiReport(null);
        setRepairDescription('');
        setRepairVehicleNumber('');
        setRepairOption('none');
        alert('Feedback submitted successfully. Thank you!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <Layout activeTab="Repairs & Assistance">
      <Head>
        <title>Power2Go - EV Roadside Rescue</title>
      </Head>

      <main className="container" style={{ flex: 1, paddingBottom: '40px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '1100px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {activeRepair ? (
            /* ACTIVE RESCUE STATUS TRACKER PANEL */
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <div>
                  <span className="pulse-dot" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-red)', marginRight: '8px' }} />
                  <strong style={{ fontSize: '1.05rem', color: 'var(--accent-red)' }}>
                    {activeRepair.service_option === 'take_to_station' || activeRepair.status === 'recovery_required' || activeRepair.status === 'station_assigned'
                      ? 'Active Towing Recovery'
                      : 'Active Roadside Rescue'}
                  </strong>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: #RP{activeRepair.id}</span>
              </div>

              {/* Timeline Status */}
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <strong style={{ fontSize: '1rem', textTransform: 'capitalize', display: 'block', color: '#fff', marginBottom: '12px' }}>
                  Status: {activeRepair.status.replace(/_/g, ' ')}
                </strong>
                {activeRepair.service_option === 'take_to_station' ? (
                  <div className="timeline-stages" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: activeRepair.status === 'recovery_required' || activeRepair.status === 'pending' ? 'var(--accent-red)' : 'inherit' }}>Dispatched</span>
                    <span style={{ color: activeRepair.status === 'on_the_way' ? 'var(--accent-red)' : 'inherit' }}>Tow En-Route</span>
                    <span style={{ color: activeRepair.status === 'arrived' ? 'var(--accent-red)' : 'inherit' }}>Arrived & Loaded</span>
                    <span style={{ color: activeRepair.status === 'station_assigned' ? 'var(--accent-red)' : 'inherit' }}>Transporting</span>
                    <span style={{ color: activeRepair.status === 'completed' ? 'var(--accent-red)' : 'inherit' }}>Completed</span>
                  </div>
                ) : (
                  <div className="timeline-stages" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: activeRepair.status === 'pending' ? 'var(--accent-red)' : 'inherit' }}>Pending</span>
                    <span style={{ color: activeRepair.status === 'accepted' ? 'var(--accent-red)' : 'inherit' }}>Accepted</span>
                    <span style={{ color: activeRepair.status === 'on_the_way' ? 'var(--accent-red)' : 'inherit' }}>En-Route</span>
                    <span style={{ color: activeRepair.status === 'arrived' ? 'var(--accent-red)' : 'inherit' }}>Arrived</span>
                    <span style={{ color: activeRepair.status === 'repair_in_progress' ? 'var(--accent-red)' : 'inherit' }}>Repairing</span>
                    <span style={{ color: activeRepair.status === 'completed' ? 'var(--accent-red)' : 'inherit' }}>Completed</span>
                  </div>
                )}
              </div>

              {/* Mechanic details */}
              {activeMechanic && activeRepair.service_option !== 'take_to_station' && activeRepair.status !== 'recovery_required' && (
                <div className="glass-panel flex-row-responsive" style={{
                  padding: '20px',
                  borderColor: 'var(--accent-red)',
                  background: 'rgba(255, 42, 95, 0.03)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    background: 'rgba(255, 42, 95, 0.1)',
                    border: '1px solid var(--accent-red)',
                    width: '55px',
                    height: '55px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src={activeMechanic.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt="Mech profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)' }} />
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>Assigned Rescue Mechanic</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Mechanic: <strong>{activeMechanic.name}</strong> | Unit: {activeMechanic.vehicle_details}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      <a href={`tel:${activeMechanic.mobile}`} style={{ color: 'var(--accent-blue)', fontWeight: 'bold', textDecoration: 'none' }}>📞 Call {activeMechanic.name}: {activeMechanic.mobile}</a>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>RATING</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--accent-orange)' }}>⭐ {activeMechanic.rating}</strong>
                  </div>
                </div>
              )}

              {/* Tow Truck Details (if towing selected) */}
              {(activeRepair.service_option === 'take_to_station' || activeRepair.status === 'recovery_required' || activeRepair.status === 'station_assigned') && (
                <div className="glass-panel flex-row-responsive" style={{
                  padding: '20px',
                  borderColor: 'var(--accent-red)',
                  background: 'rgba(255, 42, 95, 0.03)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    background: 'rgba(255, 42, 95, 0.1)',
                    border: '1px solid var(--accent-red)',
                    width: '55px',
                    height: '55px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src={activeTowDriver ? activeTowDriver.profile_photo : "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=256"} alt="Tow driver profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)' }} />
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>Active Towing Recovery Dispatch</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Driver: <strong>{activeTowDriver ? activeTowDriver.name : "Dharmesh Singh"}</strong> | Unit: {activeTowDriver ? activeTowDriver.vehicle_details : "Heavy Flatbed Recovery TN-45-TOW-998"}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      <a href={`tel:${activeTowDriver ? activeTowDriver.mobile : "+919988776655"}`} style={{ color: 'var(--accent-blue)', fontWeight: 'bold', textDecoration: 'none' }}>📞 Call {activeTowDriver ? activeTowDriver.name : "Dharmesh"}: {activeTowDriver ? activeTowDriver.mobile : "+91 9988776655"}</a>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>HUB STATUS</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent-green)' }}>En Route</strong>
                  </div>
                </div>
              )}



              {/* Towing request */}
              {activeRepair.status === 'arrived' && (
                <div className="glass-panel" style={{ padding: '16px', borderColor: 'var(--accent-red)', background: 'rgba(255, 42, 95, 0.05)', textAlign: 'center' }}>
                  <ShieldAlert style={{ width: '28px', color: 'var(--accent-red)', margin: '0 auto 10px auto' }} />
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>Roadside Repair Impossible?</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Request immediate flatbed towing recovery to closest Power2Go station hub.</p>
                  <button type="button" onClick={requestTowingRecovery} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent-red)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    🚨 Dispatch Recovery Flatbed Tow
                  </button>
                </div>
              )}

              {/* Towing status */}
              {activeRepair.status === 'recovery_required' && (
                <div style={{ padding: '16px', background: 'rgba(255, 42, 95, 0.05)', borderRadius: '10px', border: '1px dashed var(--accent-red)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Truck style={{ color: 'var(--accent-red)', width: '24px' }} />
                  <div>
                    <strong style={{ fontSize: '0.85rem', display: 'block' }}>Flatbed Recovery Dispatched</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Transporting EV to station: **{activeRepair.station_name}**</span>
                  </div>
                </div>
              )}

              {/* Estimate approval */}
              {activeRepair.estimate_status === 'pending_approval' && (
                <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--accent-orange)', background: 'rgba(255, 165, 0, 0.05)' }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>Qualified Diagnostic Estimate</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Diagnostics:</span>
                      <strong>₹{activeRepair.estimate_diagnostics.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Labor:</span>
                      <strong>₹{activeRepair.estimate_labor.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Parts:</span>
                      <strong>₹{activeRepair.estimate_parts.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', fontWeight: 700, color: '#fff' }}>
                      <span>Total:</span>
                      <span>₹{(activeRepair.estimate_labor + activeRepair.estimate_parts + activeRepair.estimate_diagnostics + activeRepair.estimate_other).toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => approveRepairEstimate(false)} style={{ flex: 1, padding: '8px', border: '1px solid var(--border-glass)', borderRadius: '6px', background: 'transparent', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>Reject</button>
                    <button type="button" onClick={() => approveRepairEstimate(true)} style={{ flex: 2, padding: '8px', border: 'none', borderRadius: '6px', background: 'var(--accent-green)', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Approve & Start Repair</button>
                  </div>
                </div>
              )}

              {/* Payment screen */}
              {activeRepair.status === 'completed' && activeRepair.payment_status === 'pending' && (
                <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--accent-green)', textAlign: 'center' }}>
                  <CheckCircle style={{ color: 'var(--accent-green)', width: '32px', margin: '0 auto 10px auto' }} />
                  <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '6px' }}>Repair Completed!</strong>
                  <button type="button" onClick={payRepairInvoice} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)', color: '#000', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    💳 Pay Invoice (₹{(activeRepair.estimate_labor + activeRepair.estimate_parts + activeRepair.estimate_diagnostics + activeRepair.estimate_other).toFixed(2)})
                  </button>
                </div>
              )}

              {/* Rating Feedback screen */}
              {showRepairFeedback && (
                <div className="glass-panel" style={{ padding: '24px', borderColor: 'var(--accent-orange)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Rate your Roadside Experience</strong>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Rate Mechanic:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setRatingMechanic(star)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                          {star <= ratingMechanic ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Rate Repair Quality:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setRatingRepair(star)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                          {star <= ratingRepair ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea placeholder="Feedback..." value={repairFeedbackText} onChange={e => setRepairFeedbackText(e.target.value)} className="glass-input" style={{ fontSize: '0.8rem', padding: '10px' }} />
                  <button type="button" onClick={submitRepairFeedback} style={{ width: '100%', padding: '10px', background: 'var(--accent-green)', color: '#000', fontWeight: 700, fontSize: '0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Submit Feedback</button>
                </div>
              )}
            </div>
          ) : (
            /* REPAIR INTAKE & AI DIAGNOSIS REQUEST */
            <div className="roadside-grid" style={{ alignItems: 'stretch' }}>
              
              {/* Left Column: Form Intake */}
              <div className="roadside-left-col" style={{ padding: '40px' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>Roadside Assistance Intake</h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 12px 0' }}>Describe the issue and let our AI assistant help identify the problem.</p>
                  <div style={{ width: '40px', height: '3px', background: '#00aa55', marginBottom: '24px' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '8px', fontWeight: 700 }}>Describe the Problem</label>
                    <textarea 
                      placeholder="Describe issue (e.g. battery warning light, flat tire, squeaking brakes)..." 
                      value={repairDescription} 
                      onChange={e => setRepairDescription(e.target.value)} 
                      className="glass-input" 
                      style={{ fontSize: '0.85rem', padding: '12px', height: '110px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#ffffff' }} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '8px', fontWeight: 700 }}>Photo Upload (Camera capture / Image upload)</label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setRepairPhoto(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ display: 'none' }}
                      id="roadside-camera-upload"
                    />
                    <label
                      htmlFor="roadside-camera-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#475569',
                        marginTop: '8px'
                      }}
                    >
                      <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: '#eefdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00aa55',
                        flexShrink: 0
                      }}>
                        <Camera style={{ width: '20px', height: '20px' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', display: 'block', color: '#0f172a' }}>
                          Capture with Camera / File Upload
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Upload clear photos or videos of the issue
                        </span>
                      </div>
                    </label>
                    {repairPhoto && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={repairPhoto} alt="Breakdown preview" style={{ width: '80px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                        <button type="button" onClick={() => setRepairPhoto(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '8px', fontWeight: 700 }}>Share Live Location</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', width: '18px' }} />
                        <input
                          type="text"
                          value={repairLocation ? `Lat: ${parseFloat(repairLocation.split(',')[0]?.split(':')[1] || '10.9602').toFixed(4)}, Lng: ${parseFloat(repairLocation.split(',')[1]?.split(':')[1] || '78.0766').toFixed(4)} (Karur City, Tamil Nadu)` : 'Locating...'}
                          disabled
                          className="glass-input"
                          style={{
                            fontSize: '0.85rem',
                            padding: '12px 12px 12px 40px',
                            width: '100%',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            color: '#475569'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={shareLiveLocation}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '8px',
                          background: '#eefdf4',
                          border: '1px solid #cbd5e1',
                          color: '#00aa55',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Navigation style={{ width: '16px', height: '16px', transform: 'rotate(45deg)' }} />
                        Share Live Location
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runAIDiagnosis}
                  disabled={aiLoading}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#00aa55',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0, 170, 85, 0.25)',
                    marginTop: '10px'
                  }}
                >
                  <ShieldCheck style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                      {aiLoading ? 'Analyzing EV Telemetry...' : 'Analyze & Get AI Diagnosis'}
                    </strong>
                    <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.9, fontWeight: 400 }}>
                      Our AI will analyze and suggest possible issues
                    </span>
                  </div>
                </button>

                {/* Diagnosis Report & Action selector */}
                {aiReport && (
                  <div className="glass-panel" style={{ padding: '20px', borderColor: '#fca5a5', background: '#fff5f5', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>AI Preliminary Assessment</span>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, background: '#ef4444', color: '#ffffff' }}>{aiReport.severity} Severity</span>
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{aiReport.diagnosis}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Category: {aiReport.category}</span>
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.78rem', color: '#475569', display: 'block' }}>Probable Causes:</strong>
                      <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {aiReport.causes.map((c: string, idx: number) => <li key={idx}>{c}</li>)}
                      </ul>
                    </div>

                    {aiReport.recommendedAction === 'tow' ? (
                      <div style={{ background: '#fff5f5', padding: '12px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.8rem', color: '#475569', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>⚠️ AI Recommended Option: Towing Recovery Required</strong>
                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                          This issue is critical. We recommend dispatching a flatbed vehicle to tow your vehicle to the nearest Power2Go Hub.
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '0.8rem', color: '#475569', textAlign: 'left' }}>
                        <strong style={{ color: '#b45309' }}>🛠️ AI Recommended Option: Mobile Mechanic Dispatch</strong>
                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                          This issue appears to be minor and resolvable on-site. We recommend booking a mechanic to inspect/repair your EV.
                        </div>
                      </div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #f59e0b', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#475569', display: 'block' }}>Recommended Action:</strong>
                      <p style={{ fontSize: '0.75rem', color: '#0f172a', margin: '2px 0 0 0', fontWeight: 500 }}>{aiReport.recommendations}</p>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', display: 'block', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      ⚠️ {aiReport.disclaimer}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <button type="button" onClick={bookRoadsideMechanic} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.15)' }}>
                        🚨 Book a Mechanic to My Location
                      </button>
                      <button type="button" onClick={() => selectTakeToStation(PREDEFINED_STATIONS[4], true)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ef4444', background: '#ffffff', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        🚛 Tow My EV to Power2Go Station
                      </button>
                      <button type="button" onClick={() => setAiReport(null)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}>
                        Cancel / Continue Later
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Helper details & realistic Tow Truck image */}
              <div className="roadside-right-col" style={{ padding: '40px 0 0 0', background: '#ffffff' }}>
                <div style={{ padding: '0 40px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#475569', display: 'block', fontWeight: 600 }}>We're here to help,</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#00aa55', margin: '4px 0 0 0', lineHeight: 1 }}>24/7</h2>
                  <div style={{ width: '40px', height: '3px', background: '#00aa55', margin: '12px 0 24px 0' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#eefdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00aa55', flexShrink: 0, marginTop: '2px' }}>
                        <Bot style={{ width: '22px', height: '22px' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>AI-Powered Diagnosis</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Get instant analysis of the problem</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#eefdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00aa55', flexShrink: 0, marginTop: '2px' }}>
                        <Wrench style={{ width: '22px', height: '22px' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>Expert Support</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Connect with nearest mechanics</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#eefdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00aa55', flexShrink: 0, marginTop: '2px' }}>
                        <ShieldCheck style={{ width: '22px', height: '22px' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>Safe & Reliable Service</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Your safety is our priority</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  height: '350px',
                  overflow: 'hidden',
                  marginTop: '30px'
                }}>
                  <img src="/tow_truck_service.jpg" alt="Power2Go Tow Truck Assistance" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* UPI Payment Modal */}
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
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '5px' }}>₹{upiAmount.toFixed(2)}</div>
                </div>

                <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', width: '160px', height: '160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#000' }} />
                </div>

                <button type="button" onClick={() => { setUpiStep('processing'); setTimeout(() => setUpiStep('success'), 2000); }} className="glass-button" style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)' }}>
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
                <button type="button" onClick={() => { setShowUPIModal(false); setUpiStep('select'); if (upiCallback) upiCallback(); }} className="glass-button" style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)' }}>
                  Confirm & Complete Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
