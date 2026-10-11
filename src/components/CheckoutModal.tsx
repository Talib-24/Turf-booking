import React, { useState } from 'react';
import { Booking } from '../types';
import { turfEngine } from '../services/turfEngine';
import { formatINR } from '../lib/constants';
import {
  X,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface CheckoutModalProps {
  booking: Booking;
  onClose: () => void;
  onPaymentSuccess: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('kabir@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;

  // 1. Standard Payment
  const handleStandardPayment = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setRefundNotice(null);

    await new Promise((r) => setTimeout(r, 600));

    const res = turfEngine.confirmPaymentTx(
      booking.razorpayOrderId || '',
      mockPaymentId,
      'sig_mock_signature_hmac'
    );

    setIsProcessing(false);

    if (res.success && res.booking) {
      onPaymentSuccess(res.booking);
    } else {
      if (res.refunded) {
        setRefundNotice(res.message);
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  // 2. Simulate Late Payment Edge Case (Slot Still Free)
  const handleLatePaymentSlotFree = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setRefundNotice(null);

    // Force expire the current hold
    const allBookings = turfEngine.getBookings();
    const target = allBookings.find((b) => b.id === booking.id);
    if (target) {
      target.status = 'EXPIRED';
      target.holdExpiresAt = new Date(Date.now() - 60000).toISOString();
    }

    await new Promise((r) => setTimeout(r, 800));

    // Confirm payment: engine will see EXPIRED, but slot is still free, so it re-confirms!
    const res = turfEngine.confirmPaymentTx(
      booking.razorpayOrderId || '',
      mockPaymentId,
      'sig_mock_signature_hmac'
    );

    setIsProcessing(false);

    if (res.success && res.booking) {
      onPaymentSuccess(res.booking);
    } else {
      setErrorMsg(res.message);
    }
  };

  // 3. Simulate Late Payment Edge Case (Slot TAKEN by competitor)
  const handleLatePaymentSlotTaken = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setRefundNotice(null);

    // Force expire current booking
    const allBookings = turfEngine.getBookings();
    const target = allBookings.find((b) => b.id === booking.id);
    if (target) {
      target.status = 'EXPIRED';
      target.holdExpiresAt = new Date(Date.now() - 60000).toISOString();
    }

    // Now insert a competitor booking in this slot to simulate someone else grabbing it!
    turfEngine.createHold(booking.turfId, booking.startTime, booking.hours, {
      id: 'usr_competitor_99',
      name: 'Rival Player',
      email: 'rival@player.com',
      role: 'customer',
      phone: '+91 99999 88888',
    });

    await new Promise((r) => setTimeout(r, 800));

    // Attempt payment confirmation: Engine will detect slot taken, reject update, and trigger 100% automated refund!
    const res = turfEngine.confirmPaymentTx(
      booking.razorpayOrderId || '',
      mockPaymentId,
      'sig_mock_signature_hmac'
    );

    setIsProcessing(false);

    if (res.refunded) {
      setRefundNotice(
        `Late Payment Handled: Slot was occupied by another player after hold expired. Automatic 100% refund of ${formatINR(
          booking.totalAmountPaise
        )} has been processed.`
      );
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleSimulateFailure = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setRefundNotice(null);
    await new Promise((r) => setTimeout(r, 500));
    setIsProcessing(false);
    setErrorMsg('Payment declined: Simulated bank network timeout (Error code: BANK_TIMEOUT_504)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Razorpay Brand Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-black text-white text-xs">
              R
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Razorpay Checkout</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                  MOCK MODE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Order ID: {booking.razorpayOrderId}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-white">{booking.turfName}</h4>
            <div className="text-xs text-slate-400">
              {new Date(booking.startTime).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              ·{' '}
              {new Date(booking.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({booking.hours} hr)
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Amount Due</div>
            <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {formatINR(booking.totalAmountPaise)}
            </div>
          </div>
        </div>

        {/* Payment Error / Refund Notice Display */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {refundNotice && (
          <div className="m-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <RefreshCw className="w-4 h-4" />
              <span>Automated Refund Executed</span>
            </div>
            <p className="leading-relaxed">{refundNotice}</p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded text-xs"
              >
                Close & View Refund in Bookings
              </button>
            </div>
          </div>
        )}

        {/* Payment Method Selector */}
        {!refundNotice && (
          <div className="p-5 space-y-5">
            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('upi')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards</span>
              </button>

              <button
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Input Details */}
            {paymentMethod === 'upi' && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Virtual Payment Address (VPA)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Test Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">CVV</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div className="text-xs text-slate-400 p-3 bg-slate-950 rounded-lg border border-slate-800">
                Simulating HDFC / ICICI / SBI instant NetBanking gateway redirect.
              </div>
            )}

            {/* Main Action Button */}
            <button
              onClick={handleStandardPayment}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay {formatINR(booking.totalAmountPaise)} & Confirm</span>
                </>
              )}
            </button>

            {/* Edge Case Simulation Toolkit */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Engineering Edge Cases</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleLatePaymentSlotFree}
                  disabled={isProcessing}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-white text-left transition-colors"
                >
                  <div className="font-semibold text-emerald-400">Late Pay (Slot Free)</div>
                  <div className="text-[10px] text-slate-500">Hold expired ➔ Re-confirms</div>
                </button>

                <button
                  type="button"
                  onClick={handleLatePaymentSlotTaken}
                  disabled={isProcessing}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white text-left transition-colors"
                >
                  <div className="font-semibold text-amber-400">Late Pay (Slot Taken)</div>
                  <div className="text-[10px] text-slate-500">Hold expired ➔ Auto 100% refund</div>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateFailure}
                  disabled={isProcessing}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-300 hover:text-white text-left transition-colors sm:col-span-2"
                >
                  <div className="font-semibold text-red-400">Simulate Payment Failure</div>
                  <div className="text-[10px] text-slate-500">Card decline / Bank 504 timeout</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
