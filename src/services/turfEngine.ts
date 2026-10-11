import {
  Booking,
  BookingStatus,
  EmailNotification,
  LoadTestResult,
  SlotAvailability,
  Turf,
  User,
  UserRole,
  WebhookEventRecord,
} from '../types';
import { DEMO_USERS, HOLD_DURATION_SECONDS, INITIAL_TURFS, MAX_ACTIVE_HOLDS_PER_USER } from '../lib/constants';

class TurfEngine {
  private turfs: Turf[] = [];
  private bookings: Booking[] = [];
  private webhookEvents: WebhookEventRecord[] = [];
  private emails: EmailNotification[] = [];
  private currentUser: User = DEMO_USERS.customer;
  private sweeperInterval: any = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    // Load state from localStorage or use defaults
    try {
      const storedTurfs = localStorage.getItem('turfline_turfs');
      const storedBookings = localStorage.getItem('turfline_bookings');
      const storedWebhooks = localStorage.getItem('turfline_webhooks');
      const storedEmails = localStorage.getItem('turfline_emails');
      const storedUser = localStorage.getItem('turfline_user');

      this.turfs = storedTurfs ? JSON.parse(storedTurfs) : [...INITIAL_TURFS];
      this.bookings = storedBookings ? JSON.parse(storedBookings) : this.createInitialSeedBookings();
      this.webhookEvents = storedWebhooks ? JSON.parse(storedWebhooks) : [];
      this.emails = storedEmails ? JSON.parse(storedEmails) : [];
      this.currentUser = storedUser ? JSON.parse(storedUser) : DEMO_USERS.customer;
    } catch {
      this.turfs = [...INITIAL_TURFS];
      this.bookings = this.createInitialSeedBookings();
      this.webhookEvents = [];
      this.emails = [];
      this.currentUser = DEMO_USERS.customer;
    }

    // Start 2-second hold expiry sweeper
    if (typeof window !== 'undefined') {
      this.sweeperInterval = window.setInterval(() => {
        this.sweepExpiredHolds();
      }, 2000);
    }
  }

  private createInitialSeedBookings(): Booking[] {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Seed: 1 confirmed booking tonight at 20:00 for Football
    const start20 = new Date(`${dateStr}T20:00:00`).toISOString();
    const end21 = new Date(`${dateStr}T21:00:00`).toISOString();

    // Seed: 1 owner blocked slot at 14:00 for maintenance
    const start14 = new Date(`${dateStr}T14:00:00`).toISOString();
    const end15 = new Date(`${dateStr}T15:00:00`).toISOString();

    return [
      {
        id: 'bk_seed_01',
        turfId: 'turf_marathahalli_fb',
        turfName: 'Parkview Pro Arena · 7v7 Arena',
        sport: 'football',
        userId: 'usr_seed_user',
        userEmail: 'vikram.singh@gmail.com',
        userName: 'Vikram Singh',
        startTime: start20,
        endTime: end21,
        hours: 1,
        totalAmountPaise: 160000,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        razorpayOrderId: 'order_seed_987654',
        razorpayPaymentId: 'pay_seed_112233',
        refundStatus: 'NONE',
      },
      {
        id: 'bk_seed_02',
        turfId: 'turf_marathahalli_fb',
        turfName: 'Parkview Pro Arena · 7v7 Arena',
        sport: 'football',
        userId: 'usr_owner_01',
        userEmail: 'owner@turf.test',
        userName: 'Rajesh Sharma (Owner)',
        startTime: start14,
        endTime: end15,
        hours: 1,
        totalAmountPaise: 0,
        status: 'BLOCKED',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        refundStatus: 'NONE',
      },
    ];
  }

  private persist() {
    try {
      localStorage.setItem('turfline_turfs', JSON.stringify(this.turfs));
      localStorage.setItem('turfline_bookings', JSON.stringify(this.bookings));
      localStorage.setItem('turfline_webhooks', JSON.stringify(this.webhookEvents));
      localStorage.setItem('turfline_emails', JSON.stringify(this.emails));
      localStorage.setItem('turfline_user', JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('Storage persistence failed', e);
    }
    this.notify();
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- USER AUTHENTICATION ---
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public switchUser(user: User) {
    this.currentUser = user;
    this.persist();
  }

  // --- TURF QUERIES ---
  public getTurfs(): Turf[] {
    return this.turfs;
  }

  public getTurfById(id: string): Turf | undefined {
    return this.turfs.find((t) => t.id === id);
  }

  public addTurf(turf: Omit<Turf, 'id'>): Turf {
    const newTurf: Turf = {
      ...turf,
      id: `turf_${Date.now()}`,
    };
    this.turfs.push(newTurf);
    this.persist();
    return newTurf;
  }

  // --- EXCLUSION CONSTRAINT ENFORCEMENT ---
  /**
   * Evaluates PostgreSQL exclusion constraint:
   * CONSTRAINT no_overlap EXCLUDE USING gist (
   *   turf_id WITH =,
   *   tstzrange(start_time, end_time) WITH &&
   * ) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))
   *
   * Ranges are half-open: [start, end), so 10:00-11:00 and 11:00-12:00 do not overlap.
   */
  private checkOverlapConstraint(turfId: string, startIso: string, endIso: string, excludeBookingId?: string): boolean {
    const newStart = new Date(startIso).getTime();
    const newEnd = new Date(endIso).getTime();

    const activeStatuses: BookingStatus[] = ['HELD', 'CONFIRMED', 'BLOCKED'];

    for (const b of this.bookings) {
      if (b.id === excludeBookingId) continue;
      if (b.turfId !== turfId) continue;
      if (!activeStatuses.includes(b.status)) continue;

      // If status is HELD, make sure it hasn't expired yet
      if (b.status === 'HELD' && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() <= Date.now()) {
          // expired hold does not block
          continue;
        }
      }

      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();

      // Half-open interval overlap check: newStart < bEnd && newEnd > bStart
      if (newStart < bEnd && newEnd > bStart) {
        return true; // Overlap detected!
      }
    }

    return false;
  }

  // --- 10-MINUTE HOLD EXPIRY SWEEPER & EAGER CLEANUP ---
  /**
   * Sweeps stale holds across all turfs
   */
  public sweepExpiredHolds(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const b of this.bookings) {
      if (b.status === 'HELD' && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() <= now) {
          b.status = 'EXPIRED';
          expiredCount++;
          this.logEmail({
            to: b.userEmail,
            subject: `Hold Expired: Slot on ${b.turfName} has been released`,
            type: 'HOLD_EXPIRED',
            contentSnippet: `Your 10-minute hold for ${new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} has expired and returned to the open slot pool.`,
            fullHtml: `<p>Hi ${b.userName},</p><p>Your 10-minute hold for <strong>${b.turfName}</strong> (${new Date(b.startTime).toLocaleString()}) was not completed within the time limit. The slot has been released back into available inventory.</p>`,
          });
        }
      }
    }

    if (expiredCount > 0) {
      this.persist();
    }
    return expiredCount;
  }

  /**
   * Eagerly clean up stale holds for a specific turf within the transaction
   */
  private eagerCleanupTurfHolds(turfId: string) {
    const now = Date.now();
    let updated = false;
    for (const b of this.bookings) {
      if (b.turfId === turfId && b.status === 'HELD' && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() <= now) {
          b.status = 'EXPIRED';
          updated = true;
        }
      }
    }
    if (updated) {
      this.persist();
    }
  }

  // --- AVAILABILITY MATRIX ---
  public getTurfAvailability(turfId: string, dateStr: string): SlotAvailability[] {
    this.eagerCleanupTurfHolds(turfId);
    const turf = this.getTurfById(turfId);
    if (!turf) return [];

    const slots: SlotAvailability[] = [];
    const now = new Date();
    const currentUserId = this.currentUser.id;

    for (let hour = 6; hour <= 22; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      const nextHourStr = (hour + 1).toString().padStart(2, '0');
      const startTimeIso = new Date(`${dateStr}T${hourStr}:00:00`).toISOString();
      const endTimeIso = new Date(`${dateStr}T${nextHourStr}:00:00`).toISOString();

      const slotStart = new Date(startTimeIso);
      const isPast = slotStart.getTime() < now.getTime();

      let status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'PAST' = isPast ? 'PAST' : 'AVAILABLE';
      let heldByCurrentUser = false;
      let holdExpiresAt: string | undefined = undefined;
      let bookingId: string | undefined = undefined;

      // Find if any booking intersects this hour
      for (const b of this.bookings) {
        if (b.turfId !== turfId) continue;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        const curStart = new Date(startTimeIso).getTime();
        const curEnd = new Date(endTimeIso).getTime();

        if (curStart < bEnd && curEnd > bStart) {
          if (b.status === 'CONFIRMED') {
            status = 'BOOKED';
            bookingId = b.id;
            break;
          } else if (b.status === 'BLOCKED') {
            status = 'BLOCKED';
            bookingId = b.id;
            break;
          } else if (b.status === 'HELD') {
            // Check if hold is still alive
            if (b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() > Date.now()) {
              status = 'HELD';
              bookingId = b.id;
              holdExpiresAt = b.holdExpiresAt;
              if (b.userId === currentUserId) {
                heldByCurrentUser = true;
              }
              break;
            }
          }
        }
      }

      slots.push({
        hour,
        timeLabel: `${hourStr}:00 - ${nextHourStr}:00`,
        startTimeIso,
        endTimeIso,
        status,
        heldByCurrentUser,
        holdExpiresAt,
        bookingId,
        pricePaise: turf.pricePerHourPaise,
      });
    }

    return slots;
  }

  // --- POST /bookings: CREATE 10-MINUTE HOLD ---
  public createHold(
    turfId: string,
    startTimeIso: string,
    hours: number = 1,
    customUser?: User
  ): { success: boolean; status: number; booking?: Booking; error?: string; code?: string } {
    const user = customUser || this.currentUser;
    const turf = this.getTurfById(turfId);
    if (!turf) {
      return { success: false, status: 404, error: 'Turf not found' };
    }

    // Eagerly expire stale holds on this turf first
    this.eagerCleanupTurfHolds(turfId);

    // Enforce 3 open holds per user
    const openHolds = this.bookings.filter(
      (b) => b.userId === user.id && b.status === 'HELD' && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() > Date.now()
    );
    if (openHolds.length >= MAX_ACTIVE_HOLDS_PER_USER) {
      return {
        success: false,
        status: 429,
        error: `Active hold limit reached. You can have at most ${MAX_ACTIVE_HOLDS_PER_USER} pending slot holds at a time.`,
        code: 'HOLD_LIMIT_EXCEEDED',
      };
    }

    // Calculate end time
    const startDate = new Date(startTimeIso);
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
    const endTimeIso = endDate.toISOString();

    // Check Postgres GiST exclusion constraint (no_overlap)
    const hasOverlap = this.checkOverlapConstraint(turfId, startTimeIso, endTimeIso);
    if (hasOverlap) {
      // PostgreSQL error 23P01 exclusion_violation
      return {
        success: false,
        status: 409,
        error: 'Constraint violation [23P01]: The requested time slot is already held, booked, or blocked.',
        code: '23P01',
      };
    }

    // Insert new HELD booking
    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
    const orderId = `order_mock_${Math.random().toString(36).substring(2, 10)}`;
    const totalAmountPaise = turf.pricePerHourPaise * hours;

    const newBooking: Booking = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      turfId,
      turfName: turf.name,
      sport: turf.sport,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userPhone: user.phone,
      startTime: startTimeIso,
      endTime: endTimeIso,
      hours,
      totalAmountPaise,
      status: 'HELD',
      holdExpiresAt,
      createdAt: new Date().toISOString(),
      razorpayOrderId: orderId,
      refundStatus: 'NONE',
    };

    this.bookings.push(newBooking);

    this.logEmail({
      to: user.email,
      subject: `Slot Held: ${turf.name} (Expires in 10 mins)`,
      type: 'HOLD_CREATED',
      contentSnippet: `Your slot at ${turf.name} for ${new Date(startTimeIso).toLocaleString()} is reserved for 10 minutes. Complete payment to confirm.`,
      fullHtml: `<p>Hi ${user.name},</p><p>We have placed a 10-minute hold on <strong>${turf.name}</strong> for ${hours} hour(s) starting at ${new Date(startTimeIso).toLocaleString()}.</p><p>Total Amount: <strong>₹${totalAmountPaise / 100}</strong><br/>Order ID: <code>${orderId}</code></p><p>Please complete payment within 10 minutes to guarantee your slot.</p>`,
    });

    this.persist();
    return { success: true, status: 201, booking: newBooking };
  }

  // --- POST /payments/verify & POST /webhooks/razorpay: CONFIRM PAYMENT TX ---
  /**
   * Idempotent confirmation function (SELECT ... FOR UPDATE semantics)
   * Handles normal confirmation AND the late-payment edge case
   */
  public confirmPaymentTx(
    orderId: string,
    paymentId: string,
    signature: string,
    isWebhook: boolean = false,
    eventId?: string
  ): {
    success: boolean;
    status: number;
    message: string;
    booking?: Booking;
    refunded?: boolean;
    isDuplicate?: boolean;
  } {
    // 1. Webhook idempotency check (webhook_events primary key / unique)
    if (isWebhook && eventId) {
      const existing = this.webhookEvents.find((e) => e.eventId === eventId);
      if (existing) {
        return {
          success: true,
          status: 200,
          message: 'DUPLICATE_EVENT: Webhook has already been received and applied.',
          isDuplicate: true,
        };
      }
    }

    // 2. Find booking
    const booking = this.bookings.find((b) => b.razorpayOrderId === orderId);
    if (!booking) {
      return { success: false, status: 404, message: 'Order not found' };
    }

    // If already CONFIRMED, return idempotent success
    if (booking.status === 'CONFIRMED') {
      if (isWebhook && eventId) {
        this.webhookEvents.push({
          eventId,
          eventType: 'payment.captured',
          orderId,
          paymentId,
          payload: { orderId, paymentId },
          receivedAt: new Date().toISOString(),
          outcome: 'PROCESSED',
          note: 'Already confirmed',
        });
        this.persist();
      }
      return { success: true, status: 200, message: 'Booking already confirmed', booking };
    }

    // Check if hold has expired (Late payment edge case)
    const holdExpired =
      booking.status === 'EXPIRED' ||
      (booking.status === 'HELD' && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= Date.now());

    if (holdExpired) {
      // THE LATE-PAYMENT EDGE CASE:
      // Customer paid after the 10-minute hold deadline!
      // Check if slot is STILL FREE:
      const slotOverlap = this.checkOverlapConstraint(booking.turfId, booking.startTime, booking.endTime, booking.id);

      if (!slotOverlap) {
        // Slot is still free! Re-confirm booking!
        booking.status = 'CONFIRMED';
        booking.razorpayPaymentId = paymentId;
        booking.holdExpiresAt = undefined;

        this.logEmail({
          to: booking.userEmail,
          subject: `Payment Received & Booking Re-confirmed! (${booking.turfName})`,
          type: 'BOOKING_CONFIRMED',
          contentSnippet: `Your payment arrived after the hold window, but the slot was still available! Your booking is successfully confirmed.`,
          fullHtml: `<p>Hi ${booking.userName},</p><p>We received your payment of <strong>₹${booking.totalAmountPaise / 100}</strong>. Although the 10-minute timer expired, your slot was still unbooked, so we re-confirmed your reservation on <strong>${booking.turfName}</strong>!</p><p>Time: ${new Date(booking.startTime).toLocaleString()}</p>`,
        });

        if (isWebhook && eventId) {
          this.webhookEvents.push({
            eventId,
            eventType: 'payment.captured',
            orderId,
            paymentId,
            payload: { orderId, paymentId, latePayment: true, resolved: 'RE_CONFIRMED' },
            receivedAt: new Date().toISOString(),
            outcome: 'PROCESSED',
            note: 'Late payment arrived; slot still free, re-confirmed.',
          });
        }

        this.persist();
        return {
          success: true,
          status: 200,
          message: 'Late payment accepted: slot was still free and has been confirmed!',
          booking,
        };
      } else {
        // Slot WAS TAKEN by someone else!
        // Database constraint rejects update. Automatic full refund initiated!
        booking.status = 'CANCELLED';
        booking.cancelledBy = 'system_late_refund';
        booking.cancelledAt = new Date().toISOString();
        booking.refundStatus = 'REFUNDED';
        booking.refundAmountPaise = booking.totalAmountPaise;
        booking.refundPercent = 100;
        booking.refundReason = 'Late payment: slot was booked by another player after hold expired. Automatic 100% refund executed.';
        booking.razorpayPaymentId = paymentId;

        this.logEmail({
          to: booking.userEmail,
          subject: `Full Refund Processed: Slot on ${booking.turfName} was no longer available`,
          type: 'LATE_PAYMENT_REFUND',
          contentSnippet: `Your hold expired and another user reserved the slot. Your full payment of ₹${booking.totalAmountPaise / 100} has been refunded immediately.`,
          fullHtml: `<p>Hi ${booking.userName},</p><p>Your payment of <strong>₹${booking.totalAmountPaise / 100}</strong> landed after the 10-minute hold window had expired. In the interim, another player reserved this slot.</p><p><strong>Action Taken:</strong> Our automated reconciliation engine has initiated an immediate <strong>100% refund of ₹${booking.totalAmountPaise / 100}</strong> to your original payment source via Razorpay.</p><p>Reference: Order ${orderId} · Payment ${paymentId}</p>`,
        });

        if (isWebhook && eventId) {
          this.webhookEvents.push({
            eventId,
            eventType: 'payment.captured',
            orderId,
            paymentId,
            payload: { orderId, paymentId, latePayment: true, resolved: 'AUTO_REFUNDED' },
            receivedAt: new Date().toISOString(),
            outcome: 'LATE_REFUND_AUTO',
            note: 'Late payment arrived but slot was taken; automatic 100% refund processed.',
          });
        }

        this.persist();
        return {
          success: false,
          status: 409,
          refunded: true,
          message: 'Hold expired and slot was taken by another player. Automatic 100% refund of payment was executed.',
          booking,
        };
      }
    }

    // Normal successful confirmation
    booking.status = 'CONFIRMED';
    booking.razorpayPaymentId = paymentId;
    booking.holdExpiresAt = undefined;

    this.logEmail({
      to: booking.userEmail,
      subject: `Booking Confirmed: ${booking.turfName} (${booking.sport.toUpperCase()})`,
      type: 'BOOKING_CONFIRMED',
      contentSnippet: `Your booking for ${new Date(booking.startTime).toLocaleString()} is confirmed. Payment ID: ${paymentId}.`,
      fullHtml: `<div style="font-family: sans-serif; padding: 16px;">
        <h2>Booking Confirmed!</h2>
        <p>Hi ${booking.userName},</p>
        <p>Your slot is locked in. Show your booking QR code or confirmation at the turf desk.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px;">
          <p><strong>Venue:</strong> ${booking.turfName}</p>
          <p><strong>Date & Time:</strong> ${new Date(booking.startTime).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${booking.hours} Hour(s)</p>
          <p><strong>Total Paid:</strong> ₹${booking.totalAmountPaise / 100}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
        </div>
      </div>`,
    });

    if (isWebhook && eventId) {
      this.webhookEvents.push({
        eventId,
        eventType: 'payment.captured',
        orderId,
        paymentId,
        payload: { orderId, paymentId },
        receivedAt: new Date().toISOString(),
        outcome: 'PROCESSED',
      });
    }

    this.persist();
    return { success: true, status: 200, message: 'Payment confirmed successfully', booking };
  }

  // --- CANCELLATION AND REFUND POLICY ---
  /**
   * Refund Policy Calculation:
   * > 24h before start: 100% refund
   * 2h to 24h before start: 50% refund
   * < 2h before start: 0% refund
   * Owner/Admin cancellation: Always 100% refund
   */
  public calculateRefundPreview(bookingId: string, actor: UserRole = 'customer') {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    if (actor === 'owner' || actor === 'admin') {
      return {
        percent: 100,
        refundAmountPaise: booking.totalAmountPaise,
        policyReason: 'Owner / Administrator emergency cancellation grants 100% full refund.',
        hoursUntilStart: 999,
      };
    }

    const now = Date.now();
    const startTime = new Date(booking.startTime).getTime();
    const msUntilStart = startTime - now;
    const hoursUntilStart = msUntilStart / (1000 * 60 * 60);

    let percent = 0;
    let policyReason = '';

    if (hoursUntilStart > 24) {
      percent = 100;
      policyReason = 'Cancelled more than 24 hours in advance (100% full refund).';
    } else if (hoursUntilStart >= 2) {
      percent = 50;
      policyReason = 'Cancelled between 2 and 24 hours prior to slot start (50% refund policy).';
    } else {
      percent = 0;
      policyReason = 'Cancelled less than 2 hours before slot start (0% refund policy).';
    }

    const refundAmountPaise = Math.round((booking.totalAmountPaise * percent) / 100);

    return {
      percent,
      refundAmountPaise,
      policyReason,
      hoursUntilStart: Math.max(0, Number(hoursUntilStart.toFixed(1))),
    };
  }

  public cancelBooking(
    bookingId: string,
    actorRole: UserRole = 'customer'
  ): { success: boolean; status: number; message: string; booking?: Booking } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, status: 404, message: 'Booking not found' };
    }

    if (booking.status === 'CANCELLED') {
      return { success: false, status: 400, message: 'Booking is already cancelled' };
    }

    const refundCalc = this.calculateRefundPreview(bookingId, actorRole);
    if (!refundCalc) {
      return { success: false, status: 400, message: 'Unable to calculate refund' };
    }

    // Update booking in transaction
    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date().toISOString();
    booking.cancelledBy = actorRole;
    booking.refundPercent = refundCalc.percent;
    booking.refundAmountPaise = refundCalc.refundAmountPaise;
    booking.refundReason = refundCalc.policyReason;
    booking.refundStatus = refundCalc.refundAmountPaise > 0 ? 'REFUNDED' : 'NONE';

    // Log notification
    this.logEmail({
      to: booking.userEmail,
      subject: `Booking Cancelled: ${booking.turfName}`,
      type: 'CANCELLATION_REFUND',
      contentSnippet: `Your reservation was cancelled. Refund: ₹${refundCalc.refundAmountPaise / 100} (${refundCalc.percent}%).`,
      fullHtml: `<p>Hi ${booking.userName},</p><p>Your booking for <strong>${booking.turfName}</strong> on ${new Date(booking.startTime).toLocaleString()} has been cancelled.</p><p><strong>Refund Details:</strong><br/>Policy: ${refundCalc.policyReason}<br/>Refund Percentage: ${refundCalc.percent}%<br/>Amount Refunded: <strong>₹${refundCalc.refundAmountPaise / 100}</strong></p><p>The slot has been released back to public availability.</p>`,
    });

    this.persist();
    return {
      success: true,
      status: 200,
      message: `Booking cancelled successfully. Refund of ₹${refundCalc.refundAmountPaise / 100} (${refundCalc.percent}%) processed.`,
      booking,
    };
  }

  // --- OWNER: BLOCK A SLOT ---
  public blockSlot(turfId: string, startTimeIso: string, hours: number = 1): { success: boolean; status: number; message: string; booking?: Booking } {
    const turf = this.getTurfById(turfId);
    if (!turf) return { success: false, status: 404, message: 'Turf not found' };

    const startDate = new Date(startTimeIso);
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
    const endTimeIso = endDate.toISOString();

    const hasOverlap = this.checkOverlapConstraint(turfId, startTimeIso, endTimeIso);
    if (hasOverlap) {
      return {
        success: false,
        status: 409,
        message: 'Cannot block slot: An active booking or hold already occupies this time range.',
      };
    }

    const blockedBooking: Booking = {
      id: `blk_${Date.now()}`,
      turfId,
      turfName: turf.name,
      sport: turf.sport,
      userId: this.currentUser.id,
      userEmail: this.currentUser.email,
      userName: `${this.currentUser.name} (Owner/Maintenance)`,
      startTime: startTimeIso,
      endTime: endTimeIso,
      hours,
      totalAmountPaise: 0,
      status: 'BLOCKED',
      createdAt: new Date().toISOString(),
      refundStatus: 'NONE',
    };

    this.bookings.push(blockedBooking);
    this.persist();
    return { success: true, status: 201, message: 'Slot blocked successfully', booking: blockedBooking };
  }

  public unblockSlot(bookingId: string): { success: boolean; message: string } {
    const index = this.bookings.findIndex((b) => b.id === bookingId && b.status === 'BLOCKED');
    if (index === -1) {
      return { success: false, message: 'Blocked slot not found' };
    }
    this.bookings.splice(index, 1);
    this.persist();
    return { success: true, message: 'Slot unblocked and returned to inventory' };
  }

  // --- CONCURRENCY LOAD TEST: 50 SIMULTANEOUS REQUESTS FOR 1 SLOT ---
  /**
   * Proves double booking is impossible under concurrency:
   * Dispatches 50 simultaneous booking requests to a single slot.
   * Exactly 1 wins (HTTP 201 Created), 49 fail with HTTP 409 Conflict (23P01 exclusion constraint).
   */
  public async runConcurrencyLoadTest(turfId: string, startTimeIso: string, hours: number = 1): Promise<LoadTestResult> {
    const turf = this.getTurfById(turfId);
    if (!turf) throw new Error('Turf not found');

    const totalRequests = 50;
    const startTime = performance.now();

    // Create 50 distinct pseudo-users attempting to grab the exact same slot concurrently
    const requestPayloads = Array.from({ length: totalRequests }).map((_, idx) => ({
      requestId: `req_${idx + 1}`,
      user: {
        id: `load_user_${idx + 1}`,
        name: `Competitor #${idx + 1}`,
        email: `competitor${idx + 1}@loadtest.net`,
        role: 'customer' as UserRole,
        phone: `+91 90000 ${10000 + idx}`,
      },
    }));

    // Dispatch all 50 requests concurrently using Promise.all
    const promises = requestPayloads.map(async (item) => {
      // Simulate random network jitter between 5ms and 35ms
      const jitterMs = Math.floor(Math.random() * 30) + 5;
      await new Promise((r) => setTimeout(r, jitterMs));

      // Attempt to acquire hold via atomic transaction check
      const res = this.createHold(turfId, startTimeIso, hours, item.user);
      return {
        requestId: item.requestId,
        userEmail: item.user.email,
        status: res.status,
        message: res.error || 'Hold successfully placed (HTTP 201)',
        timestamp: Date.now(),
        isWinner: res.success,
      };
    });

    const responses = await Promise.all(promises);
    const durationMs = Math.round(performance.now() - startTime);

    const successful = responses.filter((r) => r.status === 201).length;
    const conflicts = responses.filter((r) => r.status === 409).length;
    const errors = responses.filter((r) => r.status !== 201 && r.status !== 409).length;
    const winningReq = responses.find((r) => r.isWinner)?.requestId;

    return {
      totalRequests,
      successful,
      conflicts,
      errors,
      durationMs,
      winningRequestId: winningReq,
      responses,
    };
  }

  // --- WEBHOOK SIMULATOR ---
  public simulateRazorpayWebhook(
    orderId: string,
    paymentId: string,
    eventId: string
  ): { status: number; body: any } {
    const res = this.confirmPaymentTx(orderId, paymentId, 'sig_mock_hmac_sha256', true, eventId);
    return {
      status: res.status,
      body: {
        event: 'payment.captured',
        eventId,
        orderId,
        paymentId,
        outcome: res.message,
        bookingStatus: res.booking?.status,
        refunded: res.refunded || false,
        isDuplicate: res.isDuplicate || false,
      },
    };
  }

  // --- EMAIL OUTBOX ---
  private logEmail(email: Omit<EmailNotification, 'id' | 'sentAt'>) {
    const record: EmailNotification = {
      ...email,
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      sentAt: new Date().toISOString(),
    };
    this.emails.unshift(record);
    if (this.emails.length > 50) {
      this.emails.pop();
    }
  }

  public getEmails(): EmailNotification[] {
    return this.emails;
  }

  public clearEmails() {
    this.emails = [];
    this.persist();
  }

  public getWebhookEvents(): WebhookEventRecord[] {
    return this.webhookEvents;
  }

  public getBookings(): Booking[] {
    return this.bookings;
  }

  public getMyBookings(): Booking[] {
    return this.bookings.filter((b) => b.userId === this.currentUser.id);
  }

  // Reset engine to demo state
  public resetToDemo() {
    this.turfs = [...INITIAL_TURFS];
    this.bookings = this.createInitialSeedBookings();
    this.webhookEvents = [];
    this.emails = [];
    this.currentUser = DEMO_USERS.customer;
    this.persist();
  }
}

export const turfEngine = new TurfEngine();
