"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [expanded, setExpanded] = useState(isOpen);

  useEffect(() => {
    setExpanded(isOpen);
  }, [isOpen]);

  const navItems: NavItem[] = [
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      label: "Dashboard",
      href: "/dashboard",
      badge: 0,
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      label: "Sources",
      href: "/dashboard",
      badge: 0,
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      label: "Study",
      href: "/study",
    },
    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      label: "Settings",
      href: "/settings",
    },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-card border-r border-border z-50 overflow-y-auto transition-all duration-300 shadow-sm ${
          expanded ? "w-[200px]" : "w-[80px]"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center p-4 border-b border-border ${expanded ? 'justify-between' : 'justify-center'}`}>
          {expanded && (
            <span className="text-sm font-semibold text-foreground">Menu</span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="Toggle sidebar"
          >
            {expanded ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-accent group text-foreground ${
                expanded ? "" : "justify-center"
              }`}
              title={!expanded ? item.label : undefined}
            >
              <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                {item.icon}
              </div>
              {expanded && (
                <>
                  <span className="flex-1 text-sm font-medium">
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </a>
          ))}
        </nav>

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Quick Stats */}
        {expanded && (
          <div className="px-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Quick Stats
            </p>
            <div className="space-y-3">
              <div className="bg-muted border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Today's Goal
                </p>
                <p className="text-lg font-bold text-primary">0/10</p>
              </div>
              <div className="bg-muted border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-warning"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <p className="text-lg font-bold text-warning">0 days</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
