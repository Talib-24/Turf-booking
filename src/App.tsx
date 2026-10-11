import React, { useState, useEffect } from 'react';
import { Booking, Turf, User } from './types';
import { DEMO_USERS } from './lib/constants';
import { turfEngine } from './services/turfEngine';
import { Navbar } from './components/Navbar';
import { TurfExplorer } from './components/TurfExplorer';
import { SlotGrid } from './components/SlotGrid';
import { MyBookings } from './components/MyBookings';
import { OwnerHub } from './components/OwnerHub';
import { EngineeringLab } from './components/EngineeringLab';
import { CheckoutModal } from './components/CheckoutModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'explore' | 'grid' | 'my-bookings' | 'owner' | 'lab'>('explore');
  const [currentUser, setCurrentUser] = useState<User>(turfEngine.getCurrentUser());
  const [turfs, setTurfs] = useState<Turf[]>(turfEngine.getTurfs());
  const [selectedTurfId, setSelectedTurfId] = useState<string>(turfs[0]?.id || '');
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);

  // Target slot for concurrency testing from slot grid
  const [labInitialTurfId, setLabInitialTurfId] = useState<string | undefined>(undefined);
  const [labInitialStartTimeIso, setLabInitialStartTimeIso] = useState<string | undefined>(undefined);

  // Refresh user and turfs from engine
  useEffect(() => {
    const unsub = turfEngine.subscribe(() => {
      setTurfs(turfEngine.getTurfs());
      setCurrentUser(turfEngine.getCurrentUser());
    });
    return unsub;
  }, []);

  const handleSwitchUser = (user: User) => {
    turfEngine.switchUser(user);
    setCurrentUser(user);
  };

  const handleSelectTurf = (turfId: string) => {
    setSelectedTurfId(turfId);
    setCurrentTab('grid');
  };

  const handleOpenConcurrencyLabForSlot = (turfId: string, startTimeIso: string) => {
    setLabInitialTurfId(turfId);
    setLabInitialStartTimeIso(startTimeIso);
    setCurrentTab('lab');
  };

  const activeHolds = turfEngine.getMyBookings().filter((b) => b.status === 'HELD');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Strict Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeHoldsCount={activeHolds.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {currentTab === 'explore' && (
          <TurfExplorer
            turfs={turfs}
            onSelectTurf={handleSelectTurf}
            onOpenConcurrencyLab={() => setCurrentTab('lab')}
          />
        )}

        {currentTab === 'grid' && (
          <SlotGrid
            turfs={turfs}
            selectedTurfId={selectedTurfId}
            onSelectTurfId={setSelectedTurfId}
            currentUser={currentUser}
            onOpenCheckout={(booking) => setCheckoutBooking(booking)}
            onOpenConcurrencyLabForSlot={handleOpenConcurrencyLabForSlot}
          />
        )}

        {currentTab === 'my-bookings' && (
          <MyBookings
            currentUser={currentUser}
            onOpenCheckout={(booking) => setCheckoutBooking(booking)}
            onGoToSlotGrid={() => setCurrentTab('grid')}
          />
        )}

        {currentTab === 'owner' && (
          <OwnerHub
            currentUser={currentUser}
            turfs={turfs}
            onSwitchUser={handleSwitchUser}
          />
        )}

        {currentTab === 'lab' && (
          <EngineeringLab
            turfs={turfs}
            initialTurfId={labInitialTurfId}
            initialStartTimeIso={labInitialStartTimeIso}
          />
        )}
      </main>

      {/* Razorpay Checkout Modal */}
      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onPaymentSuccess={(confirmedBooking) => {
            setCheckoutBooking(null);
            setCurrentTab('my-bookings');
          }}
        />
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Turfline</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL 16 Exclusion Constraint & Razorpay Booking Architecture</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => turfEngine.resetToDemo()}
              className="hover:text-slate-200 transition-colors underline"
            >
              Reset Demo Data
            </button>
            <span aria-hidden="true">·</span>
            <span>IST Timezone</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
