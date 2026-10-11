import React from 'react';
import { User } from '../types';
import { DEMO_USERS } from '../lib/constants';
import { ShieldCheck, UserCheck, CalendarDays, Zap, LayoutDashboard, Compass } from 'lucide-react';

interface NavbarProps {
  currentTab: 'explore' | 'grid' | 'my-bookings' | 'owner' | 'lab';
  setCurrentTab: (tab: 'explore' | 'grid' | 'my-bookings' | 'owner' | 'lab') => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  activeHoldsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onSwitchUser,
  activeHoldsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark (Strict single text element wordmark) */}
          <button
            onClick={() => setCurrentTab('explore')}
            className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
              T
            </span>
            <span className="font-extrabold tracking-tight">Turfline</span>
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              onClick={() => setCurrentTab('explore')}
              className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'explore' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Turfs</span>
            </button>

            <button
              onClick={() => setCurrentTab('grid')}
              className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'grid' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Live Slot Grid</span>
            </button>

            <button
              onClick={() => setCurrentTab('my-bookings')}
              className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'my-bookings' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>My Bookings</span>
              {activeHoldsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                  {activeHoldsCount} hold
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('owner')}
              className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'owner' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Owner & Admin</span>
            </button>

            <button
              onClick={() => setCurrentTab('lab')}
              className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'lab' ? 'text-emerald-400 font-semibold' : 'text-slate-300'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Concurrency Lab</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Fast Role Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Demo Role Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => onSwitchUser(DEMO_USERS.customer)}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                  currentUser.role === 'customer'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Customer: Kabir Verma (customer@turf.test)"
              >
                Customer
              </button>
              <button
                onClick={() => onSwitchUser(DEMO_USERS.owner)}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                  currentUser.role === 'owner'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Owner: Rajesh Sharma (owner@turf.test)"
              >
                Owner
              </button>
              <button
                onClick={() => onSwitchUser(DEMO_USERS.admin)}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap transition-colors ${
                  currentUser.role === 'admin'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Admin: Ananya Roy (admin@turf.test)"
              >
                Admin
              </button>
            </div>

            <button
              onClick={() => setCurrentTab('grid')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              Book Slot
            </button>
          </div>
        </div>

        {/* Mobile secondary bar for compact screens */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-slate-900 text-xs overflow-x-auto gap-3">
          <button
            onClick={() => setCurrentTab('explore')}
            className={`whitespace-nowrap ${currentTab === 'explore' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Explore
          </button>
          <button
            onClick={() => setCurrentTab('grid')}
            className={`whitespace-nowrap ${currentTab === 'grid' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Live Grid
          </button>
          <button
            onClick={() => setCurrentTab('my-bookings')}
            className={`whitespace-nowrap ${currentTab === 'my-bookings' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Bookings ({activeHoldsCount})
          </button>
          <button
            onClick={() => setCurrentTab('owner')}
            className={`whitespace-nowrap ${currentTab === 'owner' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Owner
          </button>
          <button
            onClick={() => setCurrentTab('lab')}
            className={`whitespace-nowrap ${currentTab === 'lab' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Concurrency Lab
          </button>
        </div>
      </div>
    </header>
  );
};
