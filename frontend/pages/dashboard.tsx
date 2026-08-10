import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Smartphone, 
  ShieldAlert, 
  Navigation, 
  Wrench, 
  Compass,
  Truck,
  ArrowRight,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  TrendingUp,
  CreditCard,
  BatteryCharging
} from 'lucide-react';
import Layout from '@/components/Layout';

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

  if (!user) {
    return <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>Loading Dashboard...</div>;
  }

  const services = [
    {
      title: 'Express Delivery',
      description: 'On-demand charging delivered to your location.',
      tag: 'From ₹13/kWh',
      icon: Smartphone,
      color: '#00aa55',
      bgColor: '#eefdf4',
      path: '/mobile-charging'
    },
    {
      title: 'Priority SOS',
      description: 'Stuck on the road? We reach you fast.',
      tag: 'From ₹20/kWh + ₹25/km',
      icon: ShieldAlert,
      color: '#ef4444',
      bgColor: '#fff1f2',
      path: '/emergency-charging'
    },
    {
      title: 'Hub Station',
      description: 'Find nearby hubs, book slots & more.',
      tag: 'Pre-book Now',
      icon: Navigation,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      path: '/power-station'
    },
    {
      title: 'Trip Planner',
      description: 'AI-powered route & charging recommendations.',
      tag: 'Plan Your Trip',
      icon: Compass,
      color: '#0d9488',
      bgColor: '#f0fdfa',
      path: '/ai-route-planner'
    },
    {
      title: 'Repairs & Service',
      description: 'Diagnostics, repairs & roadside assistance.',
      tag: 'Book Service',
      icon: Wrench,
      color: '#d97706',
      bgColor: '#fffbeb',
      path: '/ev-services'
    },
    {
      title: 'EV Recovery',
      description: 'We tow your EV to nearest Power2Go station.',
      tag: 'Request Now',
      icon: Truck,
      color: '#9333ea',
      bgColor: '#faf5ff',
      path: '/roadside-repair'
    }
  ];

  return (
    <Layout activeTab="Dashboard">
      <Head>
        <title>Power2Go - Dashboard</title>
      </Head>

      <main className="container" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* HERO BANNER SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, #eefdf4 0%, #e2fbe9 100%)',
          border: '1px solid rgba(0, 170, 85, 0.08)',
          borderRadius: '24px',
          padding: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '40px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 170, 85, 0.03)'
        }} className="flex-row-responsive">
          
          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 170, 85, 0.08)',
              color: '#00aa55',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              width: 'fit-content'
            }}>
              ⚡ 24/7 EV Mobility Service
            </div>
            
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontFamily: 'var(--font-display)', margin: 0 }}>
              Powering Your Journey.<br />Anywhere. <span style={{ color: '#00aa55' }}>Anytime.</span>
            </h2>
            
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6, margin: 0, maxWidth: '520px' }}>
              Instant charging, emergency assistance, repairs, and trip planning - all in one platform.
            </p>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }} className="desktop-only">
            <div style={{
              width: '100%',
              maxWidth: '440px',
              height: '250px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
              border: '4px solid #ffffff'
            }}>
              <img 
                src="/ev_charging_banner.jpg" 
                alt="EV Charging Mockup" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          </div>

        </div>

        {/* SERVICES GRID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Our Services</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }} className="grid-responsive">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div 
                  key={svc.title}
                  onClick={() => router.push(svc.path)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '20px',
                    padding: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  className="service-hover-card"
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: svc.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon style={{ width: '22px', color: svc.color }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{svc.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{svc.description}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{
                      backgroundColor: svc.bgColor,
                      color: svc.color,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: `1px solid rgba(${svc.color === '#00aa55' ? '0,170,85' : svc.color === '#ef4444' ? '239,68,68' : '59,130,246'}, 0.08)`
                    }}>
                      {svc.tag}
                    </span>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: svc.color
                    }}>
                      <ArrowRight style={{ width: '14px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Styled card hover overrides */}
      <style jsx global>{`
        .service-hover-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .service-hover-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06) !important;
          border-color: #e2e8f0 !important;
        }
      `}</style>

    </Layout>
  );
}
