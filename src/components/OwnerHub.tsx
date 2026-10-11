import React, { useState, useEffect } from 'react';
import { Booking, Turf, User } from '../types';
import { turfEngine } from '../services/turfEngine';
import { formatINR, DEMO_USERS } from '../lib/constants';
import {
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { CancelModal } from './CancelModal';

interface OwnerHubProps {
  currentUser: User;
  turfs: Turf[];
  onSwitchUser: (user: User) => void;
}

export const OwnerHub: React.FC<OwnerHubProps> = ({
  currentUser,
  turfs,
  onSwitchUser,
}) => {
  const [selectedTurfId, setSelectedTurfId] = useState<string>(turfs[0]?.id || '');
  const [blockDateStr, setBlockDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [blockHour, setBlockHour] = useState<number>(14);
  const [blockDuration, setBlockDuration] = useState<number>(1);
  const [blockMsg, setBlockMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emergencyCancelBooking, setEmergencyCancelBooking] = useState<Booking | null>(null);

  const refreshData = () => {
    setAllBookings(turfEngine.getBookings());
  };

  useEffect(() => {
    refreshData();
    const unsub = turfEngine.subscribe(refreshData);
    return unsub;
  }, []);

  // Filter bookings for current owner (or all if admin)
  const accessibleTurfIds =
    currentUser.role === 'admin'
      ? turfs.map((t) => t.id)
      : turfs.filter((t) => t.ownerId === currentUser.id).map((t) => t.id);

  const ownerBookings = allBookings.filter((b) =>
    currentUser.role === 'admin' ? true : accessibleTurfIds.includes(b.turfId)
  );

  const filteredBookings = ownerBookings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  // Calculate Metrics
  const confirmedBookings = ownerBookings.filter((b) => b.status === 'CONFIRMED');
  const grossRevenuePaise = confirmedBookings.reduce((acc, b) => acc + b.totalAmountPaise, 0);
  const refundedPaise = ownerBookings
    .filter((b) => b.refundStatus === 'REFUNDED')
    .reduce((acc, b) => acc + (b.refundAmountPaise || 0), 0);
  const activeHolds = ownerBookings.filter((b) => b.status === 'HELD').length;
  const blockedSlotsCount = ownerBookings.filter((b) => b.status === 'BLOCKED').length;

  const handleBlockSlot = () => {
    setBlockMsg(null);
    const hourStr = blockHour.toString().padStart(2, '0');
    const startTimeIso = new Date(`${blockDateStr}T${hourStr}:00:00`).toISOString();

    const res = turfEngine.blockSlot(selectedTurfId, startTimeIso, blockDuration);
    if (res.success) {
      setBlockMsg({ type: 'success', text: `Slot blocked: ${res.booking?.turfName} at ${hourStr}:00.` });
      refreshData();
    } else {
      setBlockMsg({ type: 'error', text: res.message });
    }
  };

  const handleUnblock = (bookingId: string) => {
    turfEngine.unblockSlot(bookingId);
    setBlockMsg({ type: 'success', text: 'Slot unblocked and returned to customer inventory.' });
    refreshData();
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Role Alert / Quick Switcher */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>Control Hub</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{currentUser.role.toUpperCase()} MODE</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {currentUser.role === 'admin' ? 'Global Platform Management' : 'Venue Owner Operations'}
          </h2>
          <div className="text-xs text-slate-400">
            Logged in as <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.email})
          </div>
        </div>

        {currentUser.role === 'customer' && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>You are currently viewing as Customer. Switch to Owner or Admin:</span>
            <button
              onClick={() => onSwitchUser(DEMO_USERS.owner)}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded"
            >
              Owner
            </button>
            <button
              onClick={() => onSwitchUser(DEMO_USERS.admin)}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded"
            >
              Admin
            </button>
          </div>
        )}
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Gross Revenue (Confirmed)</div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-2 tabular-nums">
            {formatINR(grossRevenuePaise)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{confirmedBookings.length} completed slots</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Refunded to Customers</div>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-2 tabular-nums">
            {formatINR(refundedPaise)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Policy & late-pay refunds</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Active 10-Min Holds</div>
          <div className="text-2xl font-mono font-bold text-white mt-2 tabular-nums">
            {activeHolds}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending payment capture</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Blocked for Maintenance</div>
          <div className="text-2xl font-mono font-bold text-red-400 mt-2 tabular-nums">
            {blockedSlotsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Excluded via GiST constraint</div>
        </div>
      </div>

      {/* Slot Blocker Tool */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-400" />
              <span>Owner Slot Blocker</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Take turf offline for scheduled coaching clinics, turf grooming, or weather rainouts.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/10">
            GiST Protected
          </span>
        </div>

        {blockMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              blockMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {blockMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <div>{blockMsg.text}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Target Arena</label>
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Date</label>
            <input
              type="date"
              value={blockDateStr}
              onChange={(e) => setBlockDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Start Hour</label>
            <select
              value={blockHour}
              onChange={(e) => setBlockHour(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {Array.from({ length: 17 }).map((_, i) => {
                const h = i + 6;
                return (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00 - {(h + 1).toString().padStart(2, '0')}:00
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleBlockSlot}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Block Slot Now</span>
            </button>
          </div>
        </div>

        {/* Currently Blocked Slots */}
        {ownerBookings.filter((b) => b.status === 'BLOCKED').length > 0 && (
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-semibold text-slate-300">Active Maintenance Blocks:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ownerBookings
                .filter((b) => b.status === 'BLOCKED')
                .map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-slate-950 border border-red-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{b.turfName}</div>
                      <div className="text-slate-400 font-mono">
                        {new Date(b.startTime).toLocaleDateString()} ·{' '}
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(b.id)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      <span>Unblock</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Reservations Master Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Master Reservations Ledger</h3>
            <p className="text-xs text-slate-400">All customer bookings and payment statuses</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['all', 'CONFIRMED', 'HELD', 'CANCELLED', 'BLOCKED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Turf & Sport</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Slot Time</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No bookings found matching filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-white">{b.turfName}</div>
                      <div className="font-mono text-[10px] text-slate-400 uppercase">{b.sport}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium">{b.userName}</div>
                      <div className="text-slate-500 text-[11px]">{b.userEmail}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <div>{new Date(b.startTime).toLocaleDateString()}</div>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-3 font-mono tabular-nums font-semibold text-emerald-400">
                      {formatINR(b.totalAmountPaise)}
                    </td>
                    <td className="p-3 font-mono">
                      {b.status === 'CONFIRMED' && (
                        <span className="text-emerald-400 font-bold">CONFIRMED</span>
                      )}
                      {b.status === 'HELD' && (
                        <span className="text-amber-400 font-bold">HOLD ACTIVE</span>
                      )}
                      {b.status === 'CANCELLED' && (
                        <span className="text-red-400 font-bold">CANCELLED</span>
                      )}
                      {b.status === 'BLOCKED' && (
                        <span className="text-purple-400 font-bold">MAINTENANCE</span>
                      )}
                      {b.status === 'EXPIRED' && (
                        <span className="text-slate-500 font-bold">EXPIRED</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => setEmergencyCancelBooking(b)}
                          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-900/40 rounded text-xs transition-colors"
                          title="Owner Emergency Cancel (100% full refund)"
                        >
                          Emergency Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {emergencyCancelBooking && (
        <CancelModal
          booking={emergencyCancelBooking}
          actorRole="owner"
          onClose={() => setEmergencyCancelBooking(null)}
          onCancelled={() => {
            setEmergencyCancelBooking(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
};
