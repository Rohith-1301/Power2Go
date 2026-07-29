import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft, Users, Calendar, ShoppingBag, Star, Download, ShieldAlert, Lock, Truck } from 'lucide-react';

interface Metrics {
  totalUsers: number;
  totalBookings: number;
  totalFeedback: number;
  registrationsToday: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data states
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'feedback' | 'drivers'>('users');

  useEffect(() => {
    // Check if the user is already authenticated as admin in localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.name === 'Power2Go' && parsed.isAdmin) {
        setIsAdmin(true);
        fetchAdminData('1208006');
      }
    }
  }, []);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (adminPassword === '1208006') {
      setIsAdmin(true);
      // Cache admin status locally
      localStorage.setItem('token', 'admin_super_token');
      localStorage.setItem('user', JSON.stringify({ name: 'Power2Go', isAdmin: true }));
      fetchAdminData('1208006');
    } else {
      setAuthError('Invalid admin password.');
    }
  };

  const fetchAdminData = async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Power2Go', password }),
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve admin details');
      }

      const data = await res.json();
      setMetrics(data.metrics);
      setUsers(data.users);
      setBookings(data.bookings);
      setFeedbacks(data.feedbacks);
      setDrivers(data.drivers || []);
    } catch (err) {
      console.error(err);
      setAuthError('Connection error fetching metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDriver = async (driverId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/drivers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, approve })
      });
      if (res.ok) {
        fetchAdminData('1208006');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportExcel = () => {
    // Trigger download from API endpoint
    window.open(`/api/admin/export?password=1208006`, '_blank');
  };

  if (!isAdmin) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
        <Head>
          <title>Power2Go - Admin Portal Sign In</title>
        </Head>

        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert style={{ color: 'var(--accent-orange)', width: '32px', height: '32px' }} />
              <h2 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Login</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Access restricted to Power2Go Managers.
            </p>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(255, 42, 95, 0.1)',
              border: '1px solid var(--accent-red)',
              color: 'white',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Admin Username
              </label>
              <input
                type="text"
                className="glass-input"
                value="Power2Go"
                disabled
                style={{ cursor: 'not-allowed', opacity: 0.7 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Manager Security Code
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: '18px' }} />
                <input
                  type="password"
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="glass-button" style={{ marginTop: '10px', background: 'linear-gradient(135deg, var(--accent-orange) 0%, #d47a00 100%)', boxShadow: '0 4px 15px rgba(255, 159, 0, 0.2)' }}>
              Authorize Dashboard
            </button>
            
            <button type="button" onClick={() => router.push('/')} className="glass-button secondary" style={{ padding: '10px' }}>
              Return to Website
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>Power2Go - Admin Manager Dashboard</title>
      </Head>

      {/* Header Bar */}
      <header className="glass-panel" style={{
        margin: '20px',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '16px',
        borderColor: 'rgba(255, 159, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
            <ShieldAlert style={{ color: 'var(--accent-orange)', width: '24px' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
              Power2Go Manager Dashboard
            </h1>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)',
            boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)'
          }}
        >
          <Download style={{ width: '16px' }} />
          Export Report to Excel
        </button>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, paddingTop: '10px' }}>
        
        {/* KPI Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Card 1: Users Registered Today */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(255, 159, 0, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--accent-orange)' }}>
              <Calendar style={{ color: 'var(--accent-orange)', width: '28px', height: '28px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{loading ? '...' : metrics?.registrationsToday ?? 0}</div>
            </div>
          </div>

          {/* Card 2: Total Registered Customers */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--accent-blue)' }}>
              <Users style={{ color: 'var(--accent-blue)', width: '28px', height: '28px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Customers</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{loading ? '...' : metrics?.totalUsers ?? 0}</div>
            </div>
          </div>

          {/* Card 3: Total Bookings */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(0, 255, 135, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--accent-green)' }}>
              <ShoppingBag style={{ color: 'var(--accent-green)', width: '28px', height: '28px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Bookings</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{loading ? '...' : metrics?.totalBookings ?? 0}</div>
            </div>
          </div>

          {/* Card 4: Total Feedback */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(255, 42, 95, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--accent-red)' }}>
              <Star style={{ color: 'var(--accent-red)', width: '28px', height: '28px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Feedbacks Filed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{loading ? '...' : metrics?.totalFeedback ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="glass-panel" style={{ padding: '10px', display: 'flex', gap: '10px', marginBottom: '20px', borderRadius: '12px' }}>
          {(['users', 'bookings', 'feedback', 'drivers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="glass-input"
              style={{
                border: 'none',
                padding: '10px 20px',
                width: 'auto',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: activeTab === tab ? 'rgba(255, 159, 0, 0.15)' : 'transparent',
                color: activeTab === tab ? 'var(--accent-orange)' : 'var(--text-secondary)',
                borderRadius: '8px'
              }}
            >
              {tab === 'users' ? 'Registered Customers' : tab === 'bookings' ? 'Bookings Queue' : tab === 'feedback' ? 'Feedbacks & Queries' : 'Driver Partners'}
            </button>
          ))}
        </div>

        {/* Data Tables */}
        <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto', borderRadius: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Fetching records...</div>
          ) : activeTab === 'users' ? (
            /* Users Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Customer Name</th>
                  <th style={{ padding: '12px' }}>Register Number</th>
                  <th style={{ padding: '12px' }}>Vehicle Plate</th>
                  <th style={{ padding: '12px' }}>Registration Date</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem' }}>
                {users.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No customers registered.</td></tr>
                ) : (
                  users.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{u.register_number || 'N/A'}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-glass)', fontSize: '0.8rem' }}>
                          {u.vehicle_plate}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'bookings' ? (
            /* Bookings Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Customer</th>
                  <th style={{ padding: '12px' }}>Service Mode</th>
                  <th style={{ padding: '12px' }}>Vehicle / Charger</th>
                  <th style={{ padding: '12px' }}>Hold Location / Station</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Pay Method</th>
                  <th style={{ padding: '12px' }}>Booking Time</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem' }}>
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No bookings placed.</td></tr>
                ) : (
                  bookings.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>#{b.id}</td>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>{b.user_name}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: b.service_type.includes('SOS') || b.service_type.includes('Emergency') ? 'rgba(255,42,95,0.1)' : b.service_type.includes('Station') ? 'rgba(0,255,135,0.1)' : 'rgba(0,210,255,0.1)',
                          color: b.service_type.includes('SOS') || b.service_type.includes('Emergency') ? 'var(--accent-red)' : b.service_type.includes('Station') ? 'var(--accent-green)' : 'var(--accent-blue)',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>{b.service_type}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ textTransform: 'capitalize' }}>{b.vehicle_type}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{b.charging_type}</div>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '0.8rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.location || b.station_name}>
                        {b.station_name ? `Hub: ${b.station_name}` : b.location || '—'}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 700 }}>₹{parseFloat(b.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '14px 12px', textTransform: 'uppercase', fontSize: '0.8rem' }}>{b.payment_type}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(b.booking_time).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'feedback' ? (
            /* Feedbacks Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Customer</th>
                  <th style={{ padding: '12px' }}>Rating</th>
                  <th style={{ padding: '12px' }}>Comments / Queries</th>
                  <th style={{ padding: '12px' }}>Submitted At</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem' }}>
                {feedbacks.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No feedback submitted.</td></tr>
                ) : (
                  feedbacks.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>{f.user_name}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              style={{
                                width: '14px',
                                height: '14px',
                                fill: index < f.rating ? 'var(--accent-orange)' : 'transparent',
                                color: index < f.rating ? 'var(--accent-orange)' : 'var(--text-muted)'
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {f.comments || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No comment</span>}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Drivers Panel */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 16px 0', color: 'var(--accent-orange)' }}>Fleet Coverage Map</h3>
                  <div style={{ height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
                    <iframe
                      src="https://www.google.com/maps?q=10.9602,78.0766&z=10&output=embed"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 16px 0', color: 'var(--accent-orange)' }}>Online Partners</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                    {drivers.filter(d => d.status === 'online').length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>No drivers currently online.</p>
                    ) : (
                      drivers.filter(d => d.status === 'online').map((d, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0, 200, 87, 0.05)', border: '1px solid rgba(0, 200, 87, 0.1)', borderRadius: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>{d.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Plate: {d.vehicle_number} • {d.vehicle_type}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ background: 'var(--accent-green)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', color: 'black', fontWeight: 'bold' }}>{d.battery_capacity}% Chg</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Coords: {parseFloat(d.lat || 10.96).toFixed(3)}, {parseFloat(d.lng || 78.07).toFixed(3)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px' }}>Driver</th>
                    <th style={{ padding: '12px' }}>Driver ID</th>
                    <th style={{ padding: '12px' }}>Mobile / Email</th>
                    <th style={{ padding: '12px' }}>Aadhaar / License</th>
                    <th style={{ padding: '12px' }}>Vehicle Plate</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Battery</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem' }}>
                  {drivers.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers registered.</td></tr>
                  ) : (
                    drivers.map((d, i) => {
                      const isApproved = Boolean(Number(d.is_approved) === 1 || d.is_approved === true || d.is_approved === 'true');
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={d.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt="Profile" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ fontWeight: 600 }}>{d.name}</span>
                          </td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{d.driver_id}</td>
                          <td style={{ padding: '14px 12px', fontSize: '0.8rem' }}>
                            <div>{d.mobile}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{d.email}</div>
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '0.8rem' }}>
                            <div>Aadhaar: {d.aadhaar_number}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>DL: {d.license_number}</div>
                          </td>
                          <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{d.vehicle_number}</td>
                          <td style={{ padding: '14px 12px' }}>{d.vehicle_type}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ color: d.battery_capacity > 50 ? 'var(--accent-green)' : d.battery_capacity > 25 ? 'var(--accent-orange)' : 'var(--accent-red)', fontWeight: 'bold' }}>
                              {d.battery_capacity}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{
                              background: d.status === 'online' ? 'rgba(0,200,87,0.1)' : 'rgba(255,255,255,0.05)',
                              color: d.status === 'online' ? 'var(--accent-green)' : 'var(--text-secondary)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              textTransform: 'capitalize'
                            }}>{d.status}</span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            {isApproved ? (
                              <button
                                onClick={() => handleApproveDriver(d.driver_id, false)}
                                className="glass-button secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproveDriver(d.driver_id, true)}
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
