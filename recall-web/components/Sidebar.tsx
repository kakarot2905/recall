"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

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
    {
      icon: "📊",
      label: "Dashboard",
      href: "/dashboard",
      badge: 0,
    },
    {
      icon: "📚",
      label: "Sources",
      href: "/dashboard",
      badge: 0,
    },
    { icon: "🎯", label: "Study", href: "/study" },
    { icon: "⚙️", label: "Settings", href: "/settings" },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-muted border-r border-border z-50 overflow-y-auto transition-all duration-300 ${
          expanded ? "w-56" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {expanded && <span className="text-sm font-semibold">Menu</span>}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="Toggle sidebar"
          >
            {expanded ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-accent group ${
                expanded ? "" : "justify-center"
              }`}
              title={!expanded ? item.label : undefined}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {expanded && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
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
            <div className="space-y-2">
              <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Today's Goal</p>
                <p className="text-lg font-bold text-primary">0/10</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-orange-500">🔥</span>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <p className="text-lg font-bold text-orange-500">0 days</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
