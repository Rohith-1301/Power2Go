import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Smartphone, ShieldAlert, Navigation, LogOut, ShieldAlert as AdminIcon, Zap } from 'lucide-react';

interface User {
  name: string;
  vehiclePlate?: string;
  isAdmin?: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return <div className="flex-center" style={{ minHeight: '100vh' }}>Loading Dashboard...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>Power2Go - Dashboard</title>
      </Head>

      {/* Header Bar */}
      <header className="glass-panel" style={{
        margin: '20px',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 0 10px var(--accent-blue-glow)',
            padding: '3px'
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
          <span className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '0.5px' }}>
            Power2Go
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</div>
            {user.vehiclePlate && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.vehiclePlate}</div>
            )}
          </div>

          {user.isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="glass-button secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--accent-orange)' }}
            >
              <AdminIcon style={{ width: '14px', color: 'var(--accent-orange)' }} />
              Admin Portal
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255, 42, 95, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              color: 'var(--accent-red)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease'
            }}
          >
            <LogOut style={{ width: '16px' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '10px', fontFamily: 'var(--font-display)' }}>
            Delivering Electricity to Your Vehicle
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Instant power dispatch and charging reservations. We deliver charge right to your coordinates!
          </p>
        </div>

        {/* Dashboard Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          width: '100%'
        }}>
          {/* Card 1: Mobile Charging */}
          <div
            className="glass-panel"
            onClick={() => router.push('/mobile-charging')}
            style={{
              padding: '40px',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              background: 'rgba(0, 210, 255, 0.1)',
              border: '1px solid var(--accent-blue)',
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)'
            }}>
              <Smartphone style={{ width: '36px', height: '36px', color: 'var(--accent-blue)' }} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Express Delivery</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              On-demand charging van dispatched directly to your location. Fast delivery of electricity to your parked car.
            </p>

            <div style={{
              fontSize: '0.85rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
              color: 'var(--accent-blue)',
              fontWeight: 600
            }}>
              Rates: ₹13/kWh + ₹20/km
            </div>

            <button className="glass-button" style={{ width: '100%', marginTop: '10px' }}>
              Order Power Delivery
            </button>
          </div>

          {/* Card 2: Emergency Charging */}
          <div
            className="glass-panel"
            onClick={() => router.push('/emergency-charging')}
            style={{
              padding: '40px',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
              borderColor: 'rgba(255, 42, 95, 0.3)'
            }}
          >
            {/* Top right pulse indicator */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '10px',
              height: '10px',
              background: 'var(--accent-red)',
              borderRadius: '50%',
              boxShadow: '0 0 10px var(--accent-red)'
            }}></div>

            <div style={{
              background: 'rgba(255, 42, 95, 0.1)',
              border: '1px solid var(--accent-red)',
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 42, 95, 0.2)'
            }}>
              <ShieldAlert style={{ width: '36px', height: '36px', color: 'var(--accent-red)' }} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Priority SOS Delivery</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Stranded on the highway? Priority dispatch of charging truck with instant en-route live tracking.
            </p>

            <div style={{
              fontSize: '0.85rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
              color: 'var(--accent-red)',
              fontWeight: 600
            }}>
              Rates: ₹20/kWh + ₹25/km
            </div>

            <button className="glass-button emergency" style={{ width: '100%', marginTop: '10px' }}>
              Instant SOS Dispatch
            </button>
          </div>

          {/* Card 3: Power Station */}
          <div
            className="glass-panel"
            onClick={() => router.push('/power-station')}
            style={{
              padding: '40px',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              background: 'rgba(0, 255, 135, 0.1)',
              border: '1px solid var(--accent-green)',
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 255, 135, 0.2)'
            }}>
              <Navigation style={{ width: '36px', height: '36px', color: 'var(--accent-green)' }} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hub Station Reservation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Locate nearby EV charging stations and book a slot in advance based on your estimated reach time.
            </p>

            <div style={{
              fontSize: '0.85rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
              color: 'var(--accent-green)',
              fontWeight: 600
            }}>
              Pre-book & Reserve Places
            </div>

            <button className="glass-button" style={{
              width: '100%',
              marginTop: '10px',
              background: 'linear-gradient(135deg, var(--accent-green) 0%, #009944 100%)',
              boxShadow: '0 4px 15px rgba(0, 255, 135, 0.2)'
            }}>
              Browse Charging Hubs
            </button>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-glass)' }}>
        © 2026 Power2Go Startup. All rights reserved. Servicing 24/7.
      </footer>
    </div>
  );
}
