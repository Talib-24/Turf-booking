import React from 'react';
import { Booking } from '../types';
import { formatINR } from '../lib/constants';
import { X, QrCode, CheckCircle2, MapPin, Calendar, Clock, Download } from 'lucide-react';

interface QRModalProps {
  booking: Booking;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ booking, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 text-center space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Digital Gate Pass</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="mx-auto w-52 h-52 bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
          {/* High precision SVG QR pattern simulation */}
          <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-950">
            {/* Corner position markers */}
            <rect x="5" y="5" width="25" height="25" rx="3" stroke="#020617" strokeWidth="4" fill="none" />
            <rect x="12" y="12" width="11" height="11" fill="#020617" />

            <rect x="70" y="5" width="25" height="25" rx="3" stroke="#020617" strokeWidth="4" fill="none" />
            <rect x="77" y="12" width="11" height="11" fill="#020617" />

            <rect x="5" y="70" width="25" height="25" rx="3" stroke="#020617" strokeWidth="4" fill="none" />
            <rect x="12" y="77" width="11" height="11" fill="#020617" />

            {/* Simulated data matrix cells */}
            <rect x="36" y="8" width="5" height="5" />
            <rect x="45" y="14" width="5" height="5" />
            <rect x="55" y="8" width="5" height="5" />
            <rect x="36" y="24" width="5" height="5" />
            <rect x="48" y="24" width="5" height="5" />

            <rect x="8" y="38" width="5" height="5" />
            <rect x="18" y="44" width="5" height="5" />
            <rect x="8" y="52" width="5" height="5" />

            <rect x="35" y="38" width="6" height="6" />
            <rect x="45" y="42" width="6" height="6" />
            <rect x="58" y="38" width="6" height="6" />
            <rect x="38" y="52" width="6" height="6" />
            <rect x="52" y="52" width="6" height="6" />

            <rect x="72" y="38" width="5" height="5" />
            <rect x="85" y="44" width="5" height="5" />
            <rect x="78" y="52" width="5" height="5" />

            <rect x="36" y="72" width="5" height="5" />
            <rect x="48" y="78" width="5" height="5" />
            <rect x="58" y="72" width="5" height="5" />
            <rect x="72" y="78" width="5" height="5" />
            <rect x="85" y="72" width="5" height="5" />
            <rect x="78" y="86" width="5" height="5" />
          </svg>
        </div>

        {/* Pass Details */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">{booking.turfName}</h4>
          <div className="text-xs text-slate-400 font-mono">ID: {booking.id}</div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1 text-left">
          <div className="flex justify-between">
            <span className="text-slate-400">Player:</span>
            <span className="font-semibold text-white">{booking.userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Date:</span>
            <span>{new Date(booking.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Slot Time:</span>
            <span className="font-mono text-emerald-400">
              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Payment:</span>
            <span className="font-mono text-white">{booking.razorpayPaymentId || 'Verified'}</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Present this QR scan at the reception desk upon arrival for court floodlight activation.
        </div>
      </div>
    </div>
  );
};
