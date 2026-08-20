export type OnboardingStatus = 'not_started' | 'in_progress' | 'identity_verified' | 'completed';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  balance: number;
  pin: string;
  userType?: 'teen' | 'adult';
  dob?: string;
  age?: number;
  firstName?: string;
  lastName?: string;
  profilePhoto?: string;
  kycVerified?: boolean;
  kycIdMasked?: string;
  guardianName?: string;
  guardianPhone?: string;
  pocketMoneyPreference?: string;
  pocketMoneyAmount?: string;
  paymentPreferences?: string[];
  savingsGoal?: string;
  isOnboarded?: boolean;
  onboardingStatus?: OnboardingStatus;
  lastOnboardingStep?: string;
}

export type UserProfile = User;

export interface WalletBalance {
  balance: number;
  currency: string;
  updatedAt?: string;
}

export interface Transaction {
  transactionId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  amount: number;
  type: 'P2P_TRANSFER' | 'ADD_MONEY' | 'WITHDRAW';
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  note: string;
  paymentMethod: string;
}

export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface PaymentRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requester: string;
  payerId: string;
  payerName: string;
  requestedFrom: string;
  amount: number;
  note: string;
  status: RequestStatus;
  createdAt: string;
  timestamp: string;
}

export type NotificationType =
  | 'PAYMENT_SENT'
  | 'PAYMENT_RECEIVED'
  | 'MONEY_ADDED'
  | 'REQUEST_RECEIVED'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'PAYMENT_FAILED'
  | 'INCORRECT_PIN'
  | 'SECURITY';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  relatedTransactionId?: string;
  relatedRequestId?: string;
}

export interface AppState {
  users: User[];
  transactions: Transaction[];
  paymentRequests: PaymentRequest[];
  notifications: AppNotification[];
  currentUserId: string | null;
}

const INITIAL_USERS: User[] = [];

const STORAGE_KEY = 'payverse_v2_state';

export function normalizePaymentRequest(req: any): PaymentRequest {
  const statusRaw = String(req.status || 'Pending').toUpperCase();
  let status: 'Pending' | 'Accepted' | 'Rejected' = 'Pending';
  if (statusRaw === 'ACCEPTED') status = 'Accepted';
  else if (statusRaw === 'REJECTED') status = 'Rejected';
  
  const requesterId = req.requesterId || req.requester || '';
  const requesterName = req.requesterName || req.requester || requesterId;
  const payerId = req.payerId || req.requestedFrom || '';
  const payerName = req.payerName || req.requestedFrom || payerId;
  const created = req.createdAt || req.timestamp || new Date().toISOString();

  return {
    id: req.id || generateId('REQ'),
    requesterId,
    requesterName,
    requester: requesterName || requesterId,
    payerId,
    payerName,
    requestedFrom: payerName || payerId,
    amount: Number(req.amount) || 0,
    note: req.note || '',
    status,
    createdAt: created,
    timestamp: created,
  };
}

export function normalizeNotification(n: any): AppNotification {
  const titles: Record<string, string> = {
    PAYMENT_SENT: 'Payment Sent',
    PAYMENT_RECEIVED: 'Payment Received',
    MONEY_ADDED: 'Money Added',
    REQUEST_RECEIVED: 'Payment Request Received',
    REQUEST_ACCEPTED: 'Request Accepted',
    REQUEST_REJECTED: 'Request Declined',
    PAYMENT_FAILED: 'Payment Failed',
    INCORRECT_PIN: 'Security Alert',
    SECURITY: 'Security Notice',
  };

  const type = (n.type || 'SECURITY') as NotificationType;
  const defaultTitle = titles[type] || 'PayVerse Notification';

  return {
    id: n.id || generateId('N'),
    userId: n.userId || '',
    title: n.title || defaultTitle,
    message: n.message || '',
    type,
    timestamp: n.timestamp || new Date().toISOString(),
    read: Boolean(n.read),
    relatedTransactionId: n.relatedTransactionId || undefined,
    relatedRequestId: n.relatedRequestId || undefined,
  };
}

export function getInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppState;
      if (parsed.users && Array.isArray(parsed.transactions)) {
        parsed.users = parsed.users.map(u => ({
          ...u,
          onboardingStatus: u.onboardingStatus || (u.isOnboarded ? 'completed' : 'not_started'),
          kycVerified: u.kycVerified !== undefined ? u.kycVerified : (u.isOnboarded ? true : false),
        }));
        // Always set currentUserId to null on startup so user sees Splash -> Login/Create Account
        parsed.currentUserId = null;
        if (Array.isArray(parsed.paymentRequests)) {
          parsed.paymentRequests = parsed.paymentRequests.map(normalizePaymentRequest);
        } else {
          parsed.paymentRequests = [];
        }
        if (Array.isArray(parsed.notifications)) {
          parsed.notifications = parsed.notifications.map(normalizeNotification);
        } else {
          parsed.notifications = [];
        }
        return parsed;
      }
    }
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  return {
    users: INITIAL_USERS.map(u => ({ ...u, isOnboarded: true, onboardingStatus: 'completed', kycVerified: true })),
    transactions: [],
    paymentRequests: [],
    notifications: [],
    currentUserId: null,
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getResetState(): AppState {
  return {
    users: INITIAL_USERS.map(u => ({ ...u })),
    transactions: [],
    paymentRequests: [],
    notifications: [],
    currentUserId: null,
  };
}

export function generateTransactionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PV${date}${time}${rand}`;
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
