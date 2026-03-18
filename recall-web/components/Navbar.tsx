'use client';

import { useState } from 'react';

interface NavbarProps {
  user?: any;
  onMenuClick?: () => void;
  onRefresh?: () => void;
}

export default function Navbar({ user, onMenuClick, onRefresh }: NavbarProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '0 var(--spacing-lg)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left - Logo and Menu Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--foreground)',
            fontSize: '20px',
          }}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--primary)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
            }}
          >
            R
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--foreground)',
              letterSpacing: '-0.5px',
            }}
          >
            Recall
          </h1>
        </div>
      </div>

      {/* Right - Actions and Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onRefresh}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            color: 'var(--foreground)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-bg)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          ↻ Refresh
        </button>

        {/* Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            style={{
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              color: 'white',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              👤
            </div>
            {user?.name ? user.name.split(' ')[0] : 'User'}
          </button>

          {showProfile && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
                minWidth: '200px',
                zIndex: 1000,
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--foreground)' }}>
                  {user?.name}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {user?.email}
                </p>
              </div>
              <div style={{ padding: '8px' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--sidebar-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    sessionStorage.removeItem('recallDashboardToken');
                    window.location.href = '/';
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
