import React, { useState, useEffect } from 'react';
import { Booking, SlotAvailability, Turf, User } from '../types';
import { turfEngine } from '../services/turfEngine';
import { formatINR } from '../lib/constants';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Flame,
  Info,
} from 'lucide-react';

interface SlotGridProps {
  turfs: Turf[];
  selectedTurfId: string;
  onSelectTurfId: (id: string) => void;
  currentUser: User;
  onOpenCheckout: (booking: Booking) => void;
  onOpenConcurrencyLabForSlot: (turfId: string, startTimeIso: string) => void;
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  turfs,
  selectedTurfId,
  onSelectTurfId,
  currentUser,
  onOpenCheckout,
  onOpenConcurrencyLabForSlot,
}) => {
  // Generate next 7 dates
  const today = new Date();
  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(dates[0].dateStr);
  const [selectedHours, setSelectedHours] = useState<number>(1);
  const [selectedSlotHour, setSelectedSlotHour] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const turf = turfs.find((t) => t.id === selectedTurfId) || turfs[0];

  // Refresh slots on date/turf change or subscription
  const refreshSlots = () => {
    if (turf) {
      const avail = turfEngine.getTurfAvailability(turf.id, selectedDateStr);
      setSlots(avail);
    }
  };

  useEffect(() => {
    refreshSlots();
    const unsub = turfEngine.subscribe(() => {
      refreshSlots();
    });
    return unsub;
  }, [turf?.id, selectedDateStr, currentUser.id]);

  // Tick timer every second for accurate hold countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectSlot = (slot: SlotAvailability) => {
    setActionError(null);
    setActionSuccess(null);

    if (slot.status === 'PAST' || slot.status === 'BOOKED' || slot.status === 'BLOCKED') {
      return;
    }

    if (slot.status === 'HELD' && !slot.heldByCurrentUser) {
      setActionError('This slot is currently held by another player. Holds release after 10 minutes if uncompleted.');
      return;
    }

    // If held by current user, find booking and open checkout directly
    if (slot.status === 'HELD' && slot.heldByCurrentUser && slot.bookingId) {
      const booking = turfEngine.getBookings().find((b) => b.id === slot.bookingId);
      if (booking) {
        onOpenCheckout(booking);
        return;
      }
    }

    setSelectedSlotHour(slot.hour);
  };

  const handleCreateHold = () => {
    if (!turf || selectedSlotHour === null) return;
    setActionError(null);
    setActionSuccess(null);

    const slot = slots.find((s) => s.hour === selectedSlotHour);
    if (!slot) return;

    const res = turfEngine.createHold(turf.id, slot.startTimeIso, selectedHours, currentUser);

    if (!res.success) {
      setActionError(res.error || 'Failed to place hold');
      return;
    }

    if (res.booking) {
      setActionSuccess(`10-Minute hold placed! Order ${res.booking.razorpayOrderId} created.`);
      refreshSlots();
      // Open Razorpay checkout modal
      onOpenCheckout(res.booking);
    }
  };

  const getRemainingHoldSeconds = (expiresAtStr?: string) => {
    if (!expiresAtStr) return 0;
    const diff = Math.floor((new Date(expiresAtStr).getTime() - nowTimestamp) / 1000);
    return Math.max(0, diff);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check if selected hour is valid
  const selectedSlot = selectedSlotHour !== null ? slots.find((s) => s.hour === selectedSlotHour) : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Turf Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>Live Availability Grid</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{turf?.sport}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{turf?.name}</h2>
          <div className="text-xs text-slate-400">
            {turf?.address} · <span className="text-emerald-400 font-mono font-semibold">{formatINR(turf?.pricePerHourPaise || 0)}/hr</span>
          </div>
        </div>

        {/* Change Turf Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Switch Arena:</label>
          <select
            value={turf?.id}
            onChange={(e) => {
              onSelectTurfId(e.target.value);
              setSelectedSlotHour(null);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Carousel & Duration Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {dates.map((d) => (
            <button
              key={d.dateStr}
              onClick={() => {
                setSelectedDateStr(d.dateStr);
                setSelectedSlotHour(null);
                setActionError(null);
              }}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all text-xs whitespace-nowrap shrink-0 ${
                selectedDateStr === d.dateStr
                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`font-semibold ${selectedDateStr === d.dateStr ? 'text-emerald-400' : 'text-slate-400'}`}>
                {d.dayName}
              </span>
              <span className="font-mono text-[11px] mt-0.5">{d.displayDate}</span>
            </button>
          ))}
        </div>

        {/* Duration Segmented Control */}
        <div className="flex items-center gap-2 self-start lg:self-auto text-xs">
          <span className="text-slate-400">Duration:</span>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedHours(1)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedHours === 1 ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Hour
            </button>
            <button
              onClick={() => setSelectedHours(2)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedHours === 2 ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2 Hours
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Guarantees */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-900 border border-emerald-500/50" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/60" />
            <span>Your 10-Min Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-950/40 border border-amber-800/50 opacity-60" />
            <span>Held by Others</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-950/40 border border-red-900/50" />
            <span>Blocked / Maintenance</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PostgreSQL Exclusion Constraint Active</span>
        </div>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Request Rejected:</span>
            <div>{actionError}</div>
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          <div>{actionSuccess}</div>
        </div>
      )}

      {/* Hourly Slot Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slots.map((slot) => {
          const isSelected = selectedSlotHour === slot.hour;
          const remainingSec = slot.status === 'HELD' ? getRemainingHoldSeconds(slot.holdExpiresAt) : 0;

          // Slot styling based on status
          if (slot.status === 'PAST') {
            return (
              <div
                key={slot.hour}
                className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-600 cursor-not-allowed select-none"
              >
                <div className="font-mono text-xs font-semibold">{slot.timeLabel}</div>
                <div className="text-[11px] mt-2">Past Slot</div>
              </div>
            );
          }

          if (slot.status === 'BOOKED') {
            return (
              <div
                key={slot.hour}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-400 cursor-not-allowed select-none"
              >
                <div className="font-mono text-xs font-semibold text-slate-300">{slot.timeLabel}</div>
                <div className="text-[11px] mt-2 flex items-center gap-1 text-slate-400">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Booked</span>
                </div>
              </div>
            );
          }

          if (slot.status === 'BLOCKED') {
            return (
              <div
                key={slot.hour}
                className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 cursor-not-allowed select-none"
              >
                <div className="font-mono text-xs font-semibold text-red-300">{slot.timeLabel}</div>
                <div className="text-[11px] mt-2 flex items-center gap-1 text-red-400">
                  <Lock className="w-3 h-3 text-red-400" />
                  <span>Blocked</span>
                </div>
              </div>
            );
          }

          if (slot.status === 'HELD') {
            if (slot.heldByCurrentUser) {
              return (
                <div
                  key={slot.hour}
                  onClick={() => handleSelectSlot(slot)}
                  className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/80 cursor-pointer hover:bg-amber-500/15 transition-all relative overflow-hidden group"
                >
                  <div className="font-mono text-xs font-bold text-amber-200">{slot.timeLabel}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-amber-300 font-semibold">Your Hold</span>
                    <span className="font-mono font-bold text-amber-400 text-xs animate-pulse">
                      {formatCountdown(remainingSec)}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-amber-400 font-medium underline flex items-center gap-0.5">
                    <span>Pay now to lock</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={slot.hour}
                  className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-400/80 cursor-not-allowed select-none"
                  title="Another user currently holds this slot with a 10-minute payment countdown."
                >
                  <div className="font-mono text-xs font-semibold text-amber-300/80">{slot.timeLabel}</div>
                  <div className="text-[11px] mt-2 flex items-center gap-1 text-amber-400/80">
                    <Clock className="w-3 h-3" />
                    <span>Held by Player</span>
                  </div>
                </div>
              );
            }
          }

          // AVAILABLE
          return (
            <div
              key={slot.hour}
              onClick={() => handleSelectSlot(slot)}
              className={`p-3 rounded-xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                  : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="font-mono text-xs font-bold text-white">{slot.timeLabel}</div>
                <div className="font-mono tabular-nums text-xs font-bold text-emerald-400 mt-1">
                  {formatINR(slot.pricePaise)}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className={isSelected ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {isSelected ? 'Selected' : 'Available'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenConcurrencyLabForSlot(turf.id, slot.startTimeIso);
                  }}
                  className="text-[10px] text-slate-500 hover:text-emerald-400 p-0.5"
                  title="Test 50 concurrent requests on this slot"
                >
                  <Zap className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Drawer when a slot is chosen */}
      {selectedSlot && (
        <div className="sticky bottom-4 z-30 p-4 sm:p-5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-left w-full sm:w-auto">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Selected Slot:</span>
              <strong className="text-white font-mono">{selectedSlot.timeLabel}</strong>
              <span aria-hidden="true">·</span>
              <span>{selectedDateStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {formatINR(selectedSlot.pricePaise * selectedHours)}
              </span>
              <span className="text-xs text-slate-400">
                ({selectedHours} hour{selectedHours > 1 ? 's' : ''} total)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSelectedSlotHour(null)}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 bg-slate-800"
            >
              Clear
            </button>

            <button
              onClick={handleCreateHold}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>Hold Slot (10-Min Timer)</span>
            </button>
          </div>
        </div>
      )}

      {/* Engineering notes panel */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>How Turfline Guarantees Zero Double-Bookings</span>
        </div>
        <p className="leading-relaxed">
          When you click "Hold Slot", an atomic transaction inserts a <code>HELD</code> record with a 10-minute deadline.
          PostgreSQL enforces a range exclusion constraint (<code>tstzrange &&</code>), rejecting any overlapping booking
          with error <code>23P01</code>. If payment isn't completed within 10 minutes, the background sweeper expires the hold
          and returns the slot to available inventory.
        </p>
      </div>
    </div>
  );
};
