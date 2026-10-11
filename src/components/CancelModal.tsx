import React from 'react';
import { Booking, UserRole } from '../types';
import { turfEngine } from '../services/turfEngine';
import { formatINR } from '../lib/constants';
import { X, AlertTriangle, Clock, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CancelModalProps {
  booking: Booking;
  actorRole: UserRole;
  onClose: () => void;
  onCancelled: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  booking,
  actorRole,
  onClose,
  onCancelled,
}) => {
  const refundPreview = turfEngine.calculateRefundPreview(booking.id, actorRole);

  const handleConfirmCancel = () => {
    turfEngine.cancelBooking(booking.id, actorRole);
    onCancelled();
  };

  if (!refundPreview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400 font-bold text-base">
            <AlertTriangle className="w-5 h-5" />
            <span>Cancel Reservation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking details */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
          <div className="font-bold text-white text-sm">{booking.turfName}</div>
          <div className="text-slate-400">
            {new Date(booking.startTime).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date(booking.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="text-slate-400">
            Total Paid: <strong className="text-white font-mono">{formatINR(booking.totalAmountPaise)}</strong>
          </div>
        </div>

        {/* Live Policy Tier Inspector */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Automated Refund Policy</span>
            <span className="text-emerald-400 font-mono">
              {refundPreview.hoursUntilStart} hrs until match
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                refundPreview.percent === 100
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <div>
                <div className="font-semibold">&gt; 24 Hours in Advance</div>
                <div className="text-[11px] text-slate-400">Full 100% money back</div>
              </div>
              <span className="font-mono font-bold text-sm">100%</span>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                refundPreview.percent === 50
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <div>
                <div className="font-semibold">2 Hours to 24 Hours</div>
                <div className="text-[11px] text-slate-400">Standard late cancellation tier</div>
              </div>
              <span className="font-mono font-bold text-sm">50%</span>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                refundPreview.percent === 0
                  ? 'bg-red-500/15 border-red-500/60 text-red-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <div>
                <div className="font-semibold">&lt; 2 Hours Before Slot</div>
                <div className="text-[11px] text-slate-400">Non-refundable window</div>
              </div>
              <span className="font-mono font-bold text-sm">0%</span>
            </div>
          </div>
        </div>

        {/* Calculated Refund Summary */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Eligible Refund Amount</div>
            <div className="text-xs text-slate-500 mt-0.5">{refundPreview.policyReason}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
              {formatINR(refundPreview.refundAmountPaise)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ({refundPreview.percent}% refund)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-colors"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirmCancel}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Confirm & Release Slot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
