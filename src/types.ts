export type SportType = 'football' | 'cricket' | 'badminton' | 'tennis';

export type UserRole = 'customer' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
}

export interface Turf {
  id: string;
  name: string;
  sport: SportType;
  city: string;
  address: string;
  surface: string;
  pricePerHourPaise: number; // e.g. 150000 = ₹1,500
  image: string;
  rating: number;
  reviewCount: number;
  amenities: string[];
  dimensions: string;
  lighting: string;
  ownerId: string;
  rules: string[];
}

export type BookingStatus = 'HELD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'BLOCKED';

export interface Booking {
  id: string;
  turfId: string;
  turfName: string;
  sport: SportType;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  hours: number;
  totalAmountPaise: number;
  status: BookingStatus;
  holdExpiresAt?: string; // ISO string for 10-minute hold
  createdAt: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  refundStatus?: 'NONE' | 'REFUND_PENDING' | 'REFUNDED' | 'FAILED';
  refundAmountPaise?: number;
  refundPercent?: number;
  refundReason?: string;
  cancelledAt?: string;
  cancelledBy?: 'customer' | 'owner' | 'admin' | 'system_expired' | 'system_late_refund';
}

export interface SlotAvailability {
  hour: number; // 6 to 22 (representing 06:00 - 07:00, etc.)
  timeLabel: string; // e.g. "06:00 - 07:00"
  startTimeIso: string;
  endTimeIso: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'PAST';
  heldByCurrentUser?: boolean;
  holdExpiresAt?: string;
  bookingId?: string;
  pricePaise: number;
}

export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  orderId: string;
  paymentId?: string;
  payload: any;
  receivedAt: string;
  outcome: 'PROCESSED' | 'DUPLICATE_EVENT' | 'LATE_REFUND_AUTO' | 'FAILED';
  note?: string;
}

export interface EmailNotification {
  id: string;
  to: string;
  subject: string;
  type: 'HOLD_CREATED' | 'BOOKING_CONFIRMED' | 'CANCELLATION_REFUND' | 'LATE_PAYMENT_REFUND' | 'HOLD_EXPIRED';
  contentSnippet: string;
  fullHtml: string;
  sentAt: string;
  metadata?: Record<string, any>;
}

export interface LoadTestResult {
  totalRequests: number;
  successful: number; // HTTP 201
  conflicts: number;  // HTTP 409
  errors: number;
  durationMs: number;
  winningRequestId?: string;
  responses: Array<{
    requestId: string;
    userEmail: string;
    status: number;
    message: string;
    timestamp: number;
    isWinner: boolean;
  }>;
}
