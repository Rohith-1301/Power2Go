import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LogOut, ShieldAlert as AdminIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  headerAction?: React.ReactNode;
}

export default function Layout({ children, activeTab, headerAction }: LayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      {/* TOP HEADER BAR */}
      <header className="glass-panel app-header" style={{
        margin: '20px',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
      }}>
        
        {/* Logo container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #00aa55',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 10px rgba(0, 170, 85, 0.15)',
              flexShrink: 0
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
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '0.5px', color: '#0f172a' }}>
              Power<span style={{ color: '#00aa55' }}>2Go</span>
            </span>
          </div>

          {activeTab && (
            <div className="mobile-hide-text" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#cbd5e1', fontSize: '1.25rem', fontWeight: 300, margin: '0 12px' }}>|</span>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>{activeTab}</span>
            </div>
          )}
        </div>

        {/* User options */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {headerAction}

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
              {user.vehiclePlate && (
                <div className="mobile-hide-text" style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.vehiclePlate}</div>
              )}
            </div>

            {user.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: '#334155',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                className="sidebar-item"
              >
                Admin Portal
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 42, 95, 0.08)',
                border: '1px solid #ff2a5f',
                borderRadius: '8px',
                color: '#ff2a5f',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
              className="sidebar-item"
            >
              <LogOut style={{ width: '16px' }} />
              <span className="mobile-hide-text">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* MAIN BODY CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

    </div>
  );
}
