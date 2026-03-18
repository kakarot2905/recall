"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user?: any;
  onRefresh: () => void;
  onMenuClick: () => void;
}

export default function Navbar({ user, onRefresh, onMenuClick }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("recallDashboardToken");
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 flex items-center justify-between px-6 shadow-sm">
      {/* Left side - Logo and menu toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-accent rounded-md transition-colors text-lg"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">R</span>
          </div>
          <h1 className="font-bold text-lg hidden sm:inline">Recall</h1>
        </div>
      </div>

      {/* Right side - Refresh and user menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-accent rounded-md transition-colors text-lg"
          title="Refresh data"
        >
          ↻
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {user?.name || "User"}
            </span>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
