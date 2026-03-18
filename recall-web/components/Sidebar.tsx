'use client';

import { useState } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [expanded, setExpanded] = useState(isOpen);

  const navItems: NavItem[] = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard', badge: 0 },
    { icon: '📚', label: 'Sources', href: '/dashboard', badge: 0 },
    { icon: '🎯', label: 'Study', href: '/study' },
    { icon: '⚙️', label: 'Settings', href: '/settings' },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          width: expanded ? '240px' : '80px',
          height: 'calc(100vh - 64px)',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.3s ease',
          zIndex: 50,
          overflowY: 'auto',
          padding: '12px 0',
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            color: 'var(--foreground)',
            fontSize: '18px',
            transition: 'all 0.2s',
          }}
          aria-label="Toggle sidebar"
        >
          {expanded ? '◀' : '▶'}
        </button>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: 'var(--foreground)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                position: 'relative',
                margin: '0 12px',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '20px', minWidth: '24px', display: 'flex', justifyContent: 'center' }}>
                {item.icon}
              </span>
              {expanded && (
                <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>
                  {item.label}
                </span>
              )}
              {expanded && item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'var(--border)',
            margin: '16px 12px',
          }}
        />

        {/* Quick Stats */}
        {expanded && (
          <div style={{ padding: '0 12px' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Quick Stats
            </p>
            <div
              style={{
                display: 'grid',
                gap: '8px',
              }}
            >
              <div
                style={{
                  background: 'var(--card-bg)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Today's Goal
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--primary)',
                  }}
                >
                  0/10
                </p>
              </div>
              <div
                style={{
                  background: 'var(--card-bg)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Streak
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--success)',
                  }}
                >
                  0 days
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Spacer */}
      <div
        style={{
          marginLeft: expanded ? '240px' : '80px',
          transition: 'margin-left 0.3s ease',
        }}
      />
    </>
  );
}
