import React, { useState, useEffect } from 'react';
import { Booking, User } from '../types';
import { turfEngine } from '../services/turfEngine';
import { formatINR } from '../lib/constants';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Calendar,
  XCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { CancelModal } from './CancelModal';
import { QRModal } from './QRModal';

interface MyBookingsProps {
  currentUser: User;
  onOpenCheckout: (booking: Booking) => void;
  onGoToSlotGrid: () => void;
}

export const MyBookings: React.FC<MyBookingsProps> = ({
  currentUser,
  onOpenCheckout,
  onGoToSlotGrid,
}) => {
  const [filter, setFilter] = useState<'all' | 'holds' | 'confirmed' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [viewingQrBooking, setViewingQrBooking] = useState<Booking | null>(null);

  const refresh = () => {
    setBookings(turfEngine.getMyBookings());
  };

  useEffect(() => {
    refresh();
    const unsub = turfEngine.subscribe(refresh);
    return unsub;
  }, [currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'holds') return b.status === 'HELD';
    if (filter === 'confirmed') return b.status === 'CONFIRMED';
    if (filter === 'cancelled') return b.status === 'CANCELLED' || b.status === 'EXPIRED';
    return true;
  });

  const getRemainingHoldSeconds = (expiresAtStr?: string) => {
    if (!expiresAtStr) return 0;
    const diff = Math.floor((new Date(expiresAtStr).getTime() - nowTime) / 1000);
    return Math.max(0, diff);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Player Dashboard
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Reservations & Holds</h2>
          <div className="text-xs text-slate-400">
            Active account: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.email})
          </div>
        </div>

        <button
          onClick={onGoToSlotGrid}
          className="self-start sm:self-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span>Book Another Slot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Tabs (Interactive Segmented buttons, no pill enclosures) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All (${bookings.length})` },
          { id: 'holds', label: `Active Holds (${bookings.filter((b) => b.status === 'HELD').length})` },
          { id: 'confirmed', label: `Confirmed (${bookings.filter((b) => b.status === 'CONFIRMED').length})` },
          { id: 'cancelled', label: `Cancelled & Expired (${bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'EXPIRED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              filter === tab.id
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-medium text-slate-300">No reservations found for this view.</p>
            <button
              onClick={onGoToSlotGrid}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition-colors"
            >
              Browse Open Slots
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isHold = b.status === 'HELD';
            const remainingSec = isHold ? getRemainingHoldSeconds(b.holdExpiresAt) : 0;
            const isHoldActive = isHold && remainingSec > 0;

            return (
              <div
                key={b.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Venue & Slot Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-white tracking-tight">{b.turfName}</span>
                    <span className="font-mono text-xs uppercase text-slate-400">· {b.sport}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-emerald-300">
                      {new Date(b.startTime).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>{b.hours} hr duration</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Order: {b.razorpayOrderId}</span>
                    {b.razorpayPaymentId && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Pay ID: {b.razorpayPaymentId}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Center: Status & Price */}
                <div className="flex items-center md:flex-col md:items-end justify-between gap-1 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Booking Amount</div>
                    <div className="text-lg font-mono font-bold text-white tabular-nums">
                      {formatINR(b.totalAmountPaise)}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-1">
                    {b.status === 'CONFIRMED' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>CONFIRMED</span>
                      </div>
                    )}

                    {b.status === 'HELD' && (
                      <div className="flex items-center gap-2">
                        {isHoldActive ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>HOLD ACTIVE: {formatCountdown(remainingSec)}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 font-mono">HOLD EXPIRED</div>
                        )}
                      </div>
                    )}

                    {b.status === 'CANCELLED' && (
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-red-400 font-mono font-semibold justify-end">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>CANCELLED</span>
                        </div>
                        {b.refundAmountPaise ? (
                          <div className="text-[11px] text-emerald-400 font-mono font-bold">
                            Refunded {formatINR(b.refundAmountPaise)} ({b.refundPercent}%)
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 font-mono">0% Non-refundable</div>
                        )}
                      </div>
                    )}

                    {b.status === 'EXPIRED' && (
                      <div className="text-xs text-slate-500 font-mono">HOLD TIMED OUT</div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {b.status === 'HELD' && isHoldActive && (
                    <button
                      onClick={() => onOpenCheckout(b)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Pay Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => setViewingQrBooking(b)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => setCancellingBooking(b)}
                        className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-900/40 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation Modal */}
      {cancellingBooking && (
        <CancelModal
          booking={cancellingBooking}
          actorRole={currentUser.role}
          onClose={() => setCancellingBooking(null)}
          onCancelled={() => {
            setCancellingBooking(null);
            refresh();
          }}
        />
      )}

      {/* Gate Pass QR Modal */}
      {viewingQrBooking && (
        <QRModal
          booking={viewingQrBooking}
          onClose={() => setViewingQrBooking(null)}
        />
      )}
    </div>
  );
};
