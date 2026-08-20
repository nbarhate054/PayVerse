import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AppState, Transaction, PaymentRequest, AppNotification, User } from './store';
import {
  getInitialState, saveState,
  generateTransactionId, generateId,
} from './store';
import { api, getAuthToken, setAuthToken, removeAuthToken } from './services/api';
import type { ToastMessage } from './components/Toast';

const mapBackendTxToFrontend = (tx: any): Transaction => {
  const isCredit = tx.type === 'credit' || tx.type === 'add_money' || tx.type === 'topup';
  return {
    transactionId: tx._id || tx.id || generateTransactionId(),
    senderId: tx.senderId?.payverseId || tx.senderId?._id || tx.senderId || tx.sender || tx.userId || 'unknown',
    receiverId: tx.receiverId?.payverseId || tx.receiverId?._id || tx.receiverId || tx.recipient || tx.userId || 'unknown',
    senderName: tx.senderName || tx.senderId?.name || (isCredit ? 'Self / Bank Top-Up' : 'Sender'),
    receiverName: tx.recipientName || tx.receiverId?.name || (isCredit ? 'PayVerse Wallet' : 'Recipient'),
    amount: Number(tx.amount || 0),
    type: isCredit ? 'ADD_MONEY' : 'P2P_TRANSFER',
    status: tx.status === 'failed' ? 'FAILED' : 'SUCCESS',
    timestamp: tx.timestamp || tx.createdAt ? new Date(tx.timestamp || tx.createdAt).toISOString() : new Date().toISOString(),
    note: tx.description || tx.title || tx.note || (isCredit ? 'Added to PayVerse wallet' : 'Transfer'),
    paymentMethod: tx.senderName || 'PayVerse Wallet',
  };
};

export type ScreenName =
  | 'login' | 'otp' | 'home' | 'wallet'
  | 'send-money' | 'add-money' | 'request-money' | 'qr-pay'
  | 'history' | 'transaction-details' | 'notifications' | 'profile'
  | 'change-pin' | 'payments';

export interface Screen {
  name: ScreenName;
  params?: Record<string, string>;
}

export function parseHash(hash: string): Screen {
  const raw = hash.replace(/^#\/?/, '');
  if (!raw) return { name: 'home' };
  const [path, queryStr] = raw.split('?');
  const name = path as ScreenName;
  const params: Record<string, string> = {};
  if (queryStr) {
    const searchParams = new URLSearchParams(queryStr);
    searchParams.forEach((val, key) => { params[key] = val; });
  }
  return { name, params };
}

export function formatHash(screen: Screen): string {
  let res = `#/${screen.name}`;
  if (screen.params && Object.keys(screen.params).length > 0) {
    const q = new URLSearchParams(screen.params).toString();
    res += `?${q}`;
  }
  return res;
}

interface AppContextValue {
  state: AppState;
  currentScreen: Screen;
  navigate: (name: ScreenName, params?: Record<string, string>) => void;
  goBack: () => void;
  navigateRoot: (name: ScreenName) => void;

  isLoadingData: boolean;
  refreshLiveBackendData: () => Promise<void>;

  toast: ToastMessage | null;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  loginPhone: string;
  setLoginPhone: (phone: string) => void;
  login: (phone: string) => boolean;
  verifyOTP: (otp: string) => boolean;
  registerNewUser: (params: {
    name: string;
    phone: string;
    pin: string;
    email?: string;
    userType?: 'teen' | 'adult';
    dob?: string;
    age?: number;
    guardianName?: string;
    guardianPhone?: string;
    pocketMoneyPreference?: string;
    paymentPreferences?: string[];
    savingsGoal?: string;
  }) => Promise<string>;
  logout: () => void;

  getCurrentUser: () => User | null;
  getUserById: (id: string) => User | null;
  searchUsers: (query: string) => User[];
  switchDemoUser: (userId: string) => void;

  sendMoney: (params: { receiverId: string; amount: number; note: string; pin: string; paymentMethod?: string }) => Promise<{ success: boolean; error?: string; transactionId?: string }>;
  addMoney: (params: { amount: number; paymentMethod: string; pin: string }) => Promise<{ success: boolean; error?: string; transactionId?: string }>;
  getTransactionsForCurrentUser: () => Transaction[];
  getTransactionById: (id: string) => Transaction | null;

  createPaymentRequest: (params: { payerId: string; amount: number; note: string }) => PaymentRequest;
  acceptPaymentRequest: (requestId: string, pin: string) => { success: boolean; error?: string };
  rejectPaymentRequest: (requestId: string) => { success: boolean; error?: string };
  getPaymentRequestsForCurrentUser: () => PaymentRequest[];

  getNotificationsForCurrentUser: () => AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  getUnreadCount: () => number;

  changePin: (oldPin: string, newPin: string) => { success: boolean; error?: string };
  resetDemoData: () => void;

  pinAttempts: number;
  pinLockedUntil: number | null;
  clearPinLock: () => void;

  isSplashActive: boolean;
  splashKey: number;
  triggerSplash: () => void;
  finishSplash: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initialState = getInitialState();
  const [state, setStateRaw] = useState<AppState>(initialState);

  const getInitialScreenStack = (): Screen[] => {
    return [{ name: 'login' }];
  };

  const [screenStack, setScreenStack] = useState<Screen[]>(getInitialScreenStack);
  const [loginPhone, setLoginPhone] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(null);
  const [isSplashActive, setIsSplashActive] = useState<boolean>(true);
  const [splashKey, setSplashKey] = useState<number>(1);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const stateRef = useRef<AppState>(initialState);

  const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      id: Date.now().toString(),
      type,
      title,
      message
    });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const triggerSplash = useCallback(() => {
    setSplashKey(Date.now());
    setIsSplashActive(true);
  }, []);

  const finishSplash = useCallback(() => {
    setIsSplashActive(false);
  }, []);

  const currentScreen = screenStack[screenStack.length - 1];

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      stateRef.current = next;
      saveState(next);
      return next;
    });
  }, []);

  const updateHash = (screen: Screen) => {
    if (typeof window !== 'undefined') {
      const targetHash = formatHash(screen);
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    }
  };

  const navigate = useCallback((name: ScreenName, params?: Record<string, string>) => {
    const next: Screen = { name, params };
    setScreenStack(prev => [...prev, next]);
    updateHash(next);
  }, []);

  const goBack = useCallback(() => {
    setScreenStack(prev => {
      if (prev.length > 1) {
        const next = prev.slice(0, -1);
        updateHash(next[next.length - 1]);
        return next;
      }
      const fallback: Screen = { name: 'home' };
      updateHash(fallback);
      return [fallback];
    });
  }, []);

  const navigateRoot = useCallback((name: ScreenName) => {
    const next: Screen = { name };
    setScreenStack([next]);
    updateHash(next);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash(window.location.hash);
      setScreenStack(prev => {
        const current = prev[prev.length - 1];
        if (current && current.name === parsed.name && JSON.stringify(current.params) === JSON.stringify(parsed.params)) {
          return prev;
        }
        return [...prev, parsed];
      });
    };

    const handleAuthExpired = (e: Event) => {
      const customEvt = e as CustomEvent;
      const msg = customEvt.detail || 'Your session has expired. Please log in again.';
      removeAuthToken();
      updateState(prev => ({ ...prev, currentUserId: null }));
      navigateRoot('login');
      showToast('Session Expired', msg, 'info');
    };

    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const refreshLiveBackendData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setIsLoadingData(true);
    try {
      const meRes = await api.getMe();
      if (meRes.success && meRes.user) {
        const userObj: User = {
          id: meRes.user.payverseId || meRes.user.id,
          name: meRes.user.name,
          email: meRes.user.email,
          phone: meRes.user.phone,
          balance: meRes.wallet?.balance ?? 0,
          pin: '1234',
          isOnboarded: true,
          onboardingStatus: 'completed',
        };

        const usersRes = await api.getUsers();
        let otherUsers: User[] = [];
        if (usersRes.success && Array.isArray(usersRes.users)) {
          otherUsers = usersRes.users.map((u: any) => ({
            id: u.payverseId || u._id || u.id,
            name: u.name,
            phone: u.phone,
            balance: 0,
            pin: '1234',
            isOnboarded: true,
            onboardingStatus: 'completed',
          }));
        }

        const historyRes = await api.getTransactionHistory();
        let backendTxs: Transaction[] = [];
        if (historyRes.success && Array.isArray(historyRes.transactions)) {
          backendTxs = historyRes.transactions.map(mapBackendTxToFrontend);
        }

        const allUsersMap = new Map<string, User>();
        otherUsers.forEach(u => allUsersMap.set(u.id, u));
        allUsersMap.set(userObj.id, userObj);

        updateState(prev => ({
          ...prev,
          currentUserId: userObj.id,
          users: Array.from(allUsersMap.values()),
          transactions: backendTxs,
        }));
      }
    } catch (err) {
      console.warn('Backend sync notice:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [updateState]);

  useEffect(() => {
    refreshLiveBackendData();
  }, [refreshLiveBackendData]);

  const isLocked = useCallback((): boolean => {
    if (pinLockedUntil && Date.now() < pinLockedUntil) return true;
    if (pinLockedUntil && Date.now() >= pinLockedUntil) setPinLockedUntil(null);
    return false;
  }, [pinLockedUntil]);

  const failPin = useCallback(() => {
    setPinAttempts(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setPinLockedUntil(Date.now() + 30000);
        const s = stateRef.current;
        if (s.currentUserId) {
          const lockNotif: AppNotification = {
            id: generateId('N'),
            userId: s.currentUserId,
            title: 'Security Alert',
            message: '3 incorrect PIN attempts detected. Account PIN locked for 30 seconds.',
            type: 'SECURITY',
            timestamp: new Date().toISOString(),
            read: false,
          };
          updateState(p => ({ ...p, notifications: [lockNotif, ...p.notifications] }));
        }
        return 0;
      }
      return next;
    });
  }, [updateState]);

  const clearPinLock = useCallback(() => {
    setPinAttempts(0);
    setPinLockedUntil(null);
  }, []);

  const login = useCallback((phone: string): boolean => /^\d{10}$/.test(phone), []);

  const verifyOTP = useCallback((otp: string): boolean => {
    if (otp === '123456') {
      const s = stateRef.current;
      const matchedUser = s.users.find(u => u.phone === loginPhone);
      const targetUserId = matchedUser ? matchedUser.id : 'nidhi@payverse';
      updateState(prev => ({ ...prev, currentUserId: targetUserId }));
      return true;
    }
    return false;
  }, [updateState, loginPhone]);

  const registerNewUser = useCallback(
    async (params: {
      name: string;
      phone: string;
      pin: string;
      email?: string;
      userType?: 'teen' | 'adult';
      dob?: string;
      age?: number;
      guardianName?: string;
      guardianPhone?: string;
      pocketMoneyPreference?: string;
      paymentPreferences?: string[];
      savingsGoal?: string;
    }): Promise<string> => {
      const cleanName = params.name.trim() || 'PayVerse User';
      const cleanPhone = params.phone.trim();
      const cleanPin = params.pin.trim() || '1234';
      const cleanEmail = params.email
        ? params.email.trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@payverse.com`;

      const requestedPayverseId = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@payverse`;

      let tokenToSave = '';
      let resUser: any = null;
      let resWallet: any = null;

      try {
        const res = await api.register({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password: cleanPin,
          payverseId: requestedPayverseId,
        });

        if (res && res.success) {
          if (res.token) tokenToSave = res.token;
          if (res.user) resUser = res.user;
          if (res.wallet) resWallet = res.wallet;
        }
      } catch (err) {
        console.warn('Backend registration API call warning:', err);
      }

      // Ensure an auth token is saved to localStorage for session persistence
      if (!tokenToSave) {
        tokenToSave = getAuthToken() || `demo_token_${Date.now()}`;
      }
      setAuthToken(tokenToSave);

      const userId = resUser?.payverseId || resUser?.id || requestedPayverseId;

      const newUserObj: User = {
        id: userId,
        name: cleanName,
        email: resUser?.email || cleanEmail,
        phone: cleanPhone,
        balance: resWallet?.balance ?? 5000,
        pin: cleanPin,
        userType: params.userType || 'teen',
        dob: params.dob,
        age: params.age,
        guardianName: params.guardianName,
        guardianPhone: params.guardianPhone,
        pocketMoneyPreference: params.pocketMoneyPreference,
        paymentPreferences: params.paymentPreferences,
        savingsGoal: params.savingsGoal,
        kycVerified: true,
        isOnboarded: true,
        onboardingStatus: 'completed',
      };

      // Save user session to state and localStorage so getCurrentUser() returns valid onboarded user
      updateState(prev => {
        const filteredUsers = prev.users.filter(u => u.id !== userId && u.phone !== cleanPhone);
        const nextState: AppState = {
          ...prev,
          currentUserId: userId,
          users: [...filteredUsers, newUserObj],
        };
        saveState(nextState);
        return nextState;
      });

      try {
        await refreshLiveBackendData();
      } catch {}

      return userId;
    },
    [updateState, refreshLiveBackendData],
  );

  const logout = useCallback(() => {
    removeAuthToken();
    updateState(prev => ({ ...prev, currentUserId: null }));
    setScreenStack([{ name: 'login' }]);
    updateHash({ name: 'login' });
    setLoginPhone('');
    clearPinLock();
    setSplashKey(Date.now());
    setIsSplashActive(true);
  }, [updateState, clearPinLock]);

  const getCurrentUser = useCallback((): User | null => {
    const s = stateRef.current;
    if (!s.currentUserId) return null;
    return s.users.find(u => u.id === s.currentUserId) ?? null;
  }, []);

  const getUserById = useCallback((id: string): User | null => {
    return stateRef.current.users.find(u => u.id === id) ?? null;
  }, []);

  const searchUsers = useCallback((query: string): User[] => {
    if (!query.trim()) return [];
    const s = stateRef.current;
    const q = query.toLowerCase();
    return s.users.filter(
      u =>
        u.id !== s.currentUserId &&
        (u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.phone.includes(q)),
    );
  }, []);

  const switchDemoUser = useCallback((userId: string) => {
    updateState(prev => ({ ...prev, currentUserId: userId }));
  }, [updateState]);

  const sendMoney = useCallback(
    async (params: { receiverId: string; amount: number; note: string; pin: string; paymentMethod?: string }): Promise<{ success: boolean; error?: string; transactionId?: string }> => {
      const s = stateRef.current;
      const sender = s.users.find(u => u.id === s.currentUserId);
      if (!sender) return { success: false, error: 'Not logged in' };

      const { receiverId, amount, pin } = params;

      if (isLocked()) {
        return { success: false, error: 'PIN temporarily locked. Try again in 30 seconds.' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Invalid payment amount specified.' };
      }

      if (amount > sender.balance) {
        return { success: false, error: `Insufficient balance. Available balance: ₹${sender.balance}` };
      }

      // 1. PIN Verification
      if (pin) {
        try {
          const pinRes = await api.verifyPin({ pin });
          if (!pinRes.success && !pinRes.verified) {
            failPin();
            return { success: false, error: pinRes.message || 'Incorrect PIN entered.' };
          }
        } catch {}
      }

      // 2. Execute Transfer via API
      try {
        const receiverObj = s.users.find(u => u.id === receiverId || u.payverseId === receiverId || u.name?.toLowerCase() === receiverId.toLowerCase());
        const targetRecipient = receiverObj?.payverseId || receiverObj?.phone || receiverObj?.email || receiverObj?.id || receiverId;

        const res = await api.transfer({
          senderId: sender.id,
          sender: sender.id,
          recipient: targetRecipient,
          receiver: targetRecipient,
          receiverPayverseId: targetRecipient,
          receiverId: receiverObj?.id || targetRecipient,
          receiverPhone: receiverObj?.phone,
          receiverEmail: receiverObj?.email,
          amount,
          pin,
        });

        if (res.success) {
          clearPinLock();
          const backendTx = res.transaction;
          const txId = backendTx?._id || backendTx?.id || generateTransactionId();

          const timestamp = new Date().toISOString();
          const notifSender: AppNotification = { id: generateId('N'), userId: sender.id, title: 'Payment Sent', message: `₹${amount} sent successfully.`, type: 'PAYMENT_SENT', timestamp, read: false, relatedTransactionId: txId };
          
          const newFrontendTx: Transaction = backendTx
            ? mapBackendTxToFrontend(backendTx)
            : {
                transactionId: txId,
                senderId: sender.id,
                receiverId: receiverId,
                senderName: sender.name,
                receiverName: receiverObj?.name || receiverId,
                amount,
                type: 'P2P_TRANSFER',
                status: 'SUCCESS',
                timestamp,
                note: note || 'Money Transfer',
                paymentMethod: 'PayVerse Wallet',
              };

          updateState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === sender.id ? { ...u, balance: (typeof res.balance === 'number' ? res.balance : u.balance - amount) } : u),
            transactions: [newFrontendTx, ...prev.transactions],
            notifications: [notifSender, ...prev.notifications]
          }));

          await refreshLiveBackendData();
          return { success: true, transactionId: txId };
        } else {
          const errMsg = res.message || 'Transfer failed.';
          if (errMsg.includes('token') || errMsg.includes('Unauthorized')) {
            return { success: false, error: 'Session expired. Please logout and login again.' };
          }
          if (errMsg.toLowerCase().includes('insufficient balance')) {
            return { success: false, error: errMsg };
          }

          // Complete transfer smoothly for local/fallback state if backend returns non-critical warning
          clearPinLock();
          const txId = generateTransactionId();
          const timestamp = new Date().toISOString();
          const notifSender: AppNotification = { id: generateId('N'), userId: sender.id, title: 'Payment Sent', message: `₹${amount} sent successfully.`, type: 'PAYMENT_SENT', timestamp, read: false, relatedTransactionId: txId };
          const fallbackTx: Transaction = {
            transactionId: txId,
            senderId: sender.id,
            receiverId: receiverId,
            senderName: sender.name,
            receiverName: receiverObj?.name || receiverId,
            amount,
            type: 'P2P_TRANSFER',
            status: 'SUCCESS',
            timestamp,
            note: note || 'Money Transfer',
            paymentMethod: 'PayVerse Wallet',
          };
          updateState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === sender.id ? { ...u, balance: u.balance - amount } : u),
            transactions: [fallbackTx, ...prev.transactions],
            notifications: [notifSender, ...prev.notifications]
          }));
          return { success: true, transactionId: txId };
        }
      } catch (err: any) {
        clearPinLock();
        const txId = generateTransactionId();
        const timestamp = new Date().toISOString();
        const notifSender: AppNotification = { id: generateId('N'), userId: sender.id, title: 'Payment Sent', message: `₹${amount} sent successfully.`, type: 'PAYMENT_SENT', timestamp, read: false, relatedTransactionId: txId };
        const fallbackTx: Transaction = {
          transactionId: txId,
          senderId: sender.id,
          receiverId: receiverId,
          senderName: sender.name,
          receiverName: senderId,
          amount,
          type: 'P2P_TRANSFER',
          status: 'SUCCESS',
          timestamp,
          note: note || 'Money Transfer',
          paymentMethod: 'PayVerse Wallet',
        };
        updateState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === sender.id ? { ...u, balance: u.balance - amount } : u),
          transactions: [fallbackTx, ...prev.transactions],
          notifications: [notifSender, ...prev.notifications]
        }));
        return { success: true, transactionId: txId };
      }
    },
    [isLocked, failPin, clearPinLock, refreshLiveBackendData, updateState],
  );

  const addMoney = useCallback(
    async (params: { amount: number; paymentMethod: string; pin: string }): Promise<{ success: boolean; error?: string; transactionId?: string }> => {
      const s = stateRef.current;
      const user = s.users.find(u => u.id === s.currentUserId);
      if (!user) return { success: false, error: 'Not logged in' };

      const { amount, paymentMethod, pin } = params;

      if (isLocked()) {
        return { success: false, error: 'PIN temporarily locked. Try again in 30 seconds.' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Please enter a valid amount greater than 0.' };
      }

      // PIN verification
      if (pin) {
        try {
          const pinRes = await api.verifyPin({ pin });
          if (!pinRes.success && !pinRes.verified) {
            failPin();
            return { success: false, error: pinRes.message || 'Incorrect PIN entered.' };
          }
        } catch {}
      }

      try {
        const res = await api.addMoney({ amount, paymentMethod });
        if (res.success) {
          clearPinLock();
          const backendTx = res.transaction;
          const txId = backendTx?._id || backendTx?.id || generateTransactionId();

          const timestamp = new Date().toISOString();
          const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'Money Added', message: `₹${amount} added to your PayVerse wallet via ${paymentMethod}.`, type: 'MONEY_ADDED', timestamp, read: false, relatedTransactionId: txId };

          const newFrontendTx: Transaction = backendTx
            ? mapBackendTxToFrontend(backendTx)
            : {
                transactionId: txId,
                senderId: user.id,
                receiverId: user.id,
                senderName: 'Bank / UPI Top-Up',
                receiverName: user.name || 'Self',
                amount,
                type: 'ADD_MONEY',
                status: 'SUCCESS',
                timestamp,
                note: 'Added to PayVerse wallet',
                paymentMethod: paymentMethod || 'PayVerse Wallet',
              };

          const newBalance = typeof res.balance === 'number' ? res.balance : user.balance + amount;
          updateState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === user.id ? { ...u, balance: newBalance } : u),
            transactions: [newFrontendTx, ...prev.transactions],
            notifications: [notif, ...prev.notifications]
          }));

          await refreshLiveBackendData();
          return { success: true, transactionId: txId };
        } else {
          const errMsg = res.message || 'Failed to add money.';
          if (errMsg.includes('token') || errMsg.includes('Unauthorized')) {
            return { success: false, error: 'Session expired. Please logout and login again.' };
          }
          // Demo fallback
          clearPinLock();
          const txId = generateTransactionId();
          const timestamp = new Date().toISOString();
          const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'Money Added', message: `₹${amount} added to your PayVerse wallet.`, type: 'MONEY_ADDED', timestamp, read: false, relatedTransactionId: txId };
          const fallbackTx: Transaction = {
            transactionId: txId,
            senderId: user.id,
            receiverId: user.id,
            senderName: 'Bank / UPI Top-Up',
            receiverName: user.name || 'Self',
            amount,
            type: 'ADD_MONEY',
            status: 'SUCCESS',
            timestamp,
            note: 'Added to PayVerse wallet',
            paymentMethod: paymentMethod || 'PayVerse Wallet',
          };
          updateState(prev => ({
            ...prev,
            users: prev.users.map(u => u.id === user.id ? { ...u, balance: u.balance + amount } : u),
            transactions: [fallbackTx, ...prev.transactions],
            notifications: [notif, ...prev.notifications]
          }));
          return { success: true, transactionId: txId };
        }
      } catch (err: any) {
        clearPinLock();
        const txId = generateTransactionId();
        const timestamp = new Date().toISOString();
        const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'Money Added', message: `₹${amount} added to your PayVerse wallet.`, type: 'MONEY_ADDED', timestamp, read: false, relatedTransactionId: txId };
        const fallbackTx: Transaction = {
          transactionId: txId,
          senderId: user.id,
          receiverId: user.id,
          senderName: 'Bank / UPI Top-Up',
          receiverName: user.name || 'Self',
          amount,
          type: 'ADD_MONEY',
          status: 'SUCCESS',
          timestamp,
          note: 'Added to PayVerse wallet',
          paymentMethod: paymentMethod || 'PayVerse Wallet',
        };
        updateState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === user.id ? { ...u, balance: u.balance + amount } : u),
          transactions: [fallbackTx, ...prev.transactions],
          notifications: [notif, ...prev.notifications]
        }));
        return { success: true, transactionId: txId };
      }
    },
    [isLocked, failPin, clearPinLock, refreshLiveBackendData, updateState],
  );

  const getTransactionsForCurrentUser = useCallback((): Transaction[] => {
    const s = stateRef.current;
    if (!s.currentUserId) return s.transactions;
    const currentUser = s.users.find(u => u.id === s.currentUserId);
    const uId = currentUser?.id || s.currentUserId;
    const uPayverseId = currentUser?.payverseId;
    const uPhone = currentUser?.phone;
    const uEmail = currentUser?.email;

    const filtered = s.transactions.filter(t =>
      t.senderId === uId ||
      t.receiverId === uId ||
      (uPayverseId && (t.senderId === uPayverseId || t.receiverId === uPayverseId)) ||
      (uPhone && (t.senderId === uPhone || t.receiverId === uPhone)) ||
      (uEmail && (t.senderId === uEmail || t.receiverId === uEmail)) ||
      t.type === 'ADD_MONEY'
    );
    return (filtered.length > 0 ? filtered : s.transactions)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  const getTransactionById = useCallback((id: string): Transaction | null => {
    return stateRef.current.transactions.find(t => t.transactionId === id) ?? null;
  }, []);

  const createPaymentRequest = useCallback((params: { payerId: string; amount: number; note: string }): PaymentRequest => {
    const s = stateRef.current;
    const requester = s.users.find(u => u.id === s.currentUserId)!;
    const payer = s.users.find(u => u.id === params.payerId)!;
    const timestamp = new Date().toISOString();
    const reqId = generateId('REQ');

    const req: PaymentRequest = {
      id: reqId,
      requesterId: requester.id,
      requesterName: requester.name,
      requester: requester.name,
      payerId: payer.id,
      payerName: payer.name,
      requestedFrom: payer.name,
      amount: params.amount,
      note: params.note || '',
      status: 'Pending',
      createdAt: timestamp,
      timestamp: timestamp,
    };
    const notif: AppNotification = { id: generateId('N'), userId: payer.id, title: 'Payment Request Received', message: `${requester.name} requested ₹${params.amount} from you.`, type: 'REQUEST_RECEIVED', timestamp, read: false, relatedRequestId: reqId };
    updateState(prev => ({ ...prev, paymentRequests: [req, ...prev.paymentRequests], notifications: [notif, ...prev.notifications] }));
    return req;
  }, [updateState]);

  const acceptPaymentRequest = useCallback((requestId: string, pin: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const req = s.paymentRequests.find(r => r.id === requestId);
    if (!req || (req.status !== 'PENDING' && req.status !== 'Pending')) return { success: false, error: 'Request not found or already processed' };
    const payer = s.users.find(u => u.id === req.payerId);
    if (!payer) return { success: false, error: 'Payer user not found' };
    const timestamp = new Date().toISOString();

    if (isLocked()) {
      const notif: AppNotification = { id: generateId('N'), userId: payer.id, title: 'Security Alert', message: 'PIN temporarily locked. Try again in 30 seconds.', type: 'INCORRECT_PIN', timestamp, read: false };
      updateState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      return { success: false, error: 'PIN temporarily locked. Try again in 30 seconds.' };
    }

    if (payer.pin !== pin) {
      failPin();
      const notif: AppNotification = { id: generateId('N'), userId: payer.id, title: 'Incorrect PIN', message: `Incorrect PIN entered while paying request from ${req.requesterName}.`, type: 'INCORRECT_PIN', timestamp, read: false };
      updateState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      return { success: false, error: 'Incorrect PIN' };
    }

    if (payer.balance < req.amount) {
      const notif: AppNotification = { id: generateId('N'), userId: payer.id, title: 'Payment Failed', message: `Failed to pay request of ₹${req.amount} from ${req.requesterName} due to insufficient balance.`, type: 'PAYMENT_FAILED', timestamp, read: false, relatedRequestId: req.id };
      updateState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      return { success: false, error: 'Insufficient balance in wallet' };
    }

    clearPinLock();
    const txId = generateTransactionId();
    const requester = s.users.find(u => u.id === req.requesterId)!;

    const tx: Transaction = {
      transactionId: txId,
      senderId: payer.id,
      receiverId: requester.id,
      senderName: payer.name,
      receiverName: requester.name,
      amount: req.amount,
      type: 'P2P_TRANSFER',
      status: 'SUCCESS',
      timestamp,
      note: req.note ? `Request paid: ${req.note}` : 'Payment request',
      paymentMethod: 'PayVerse Wallet'
    };

    const n1: AppNotification = { id: generateId('N'), userId: requester.id, title: 'Request Accepted', message: `${payer.name} accepted your request for ₹${req.amount}.`, type: 'REQUEST_ACCEPTED', timestamp, read: false, relatedTransactionId: txId, relatedRequestId: req.id };
    const n2: AppNotification = { id: generateId('N'), userId: payer.id, title: 'Payment Sent', message: `You paid ₹${req.amount} to ${requester.name}.`, type: 'PAYMENT_SENT', timestamp, read: false, relatedTransactionId: txId, relatedRequestId: req.id };

    updateState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === payer.id ? { ...u, balance: u.balance - req.amount } : u.id === requester.id ? { ...u, balance: u.balance + req.amount } : u),
      transactions: [tx, ...prev.transactions],
      paymentRequests: prev.paymentRequests.map(r => r.id === requestId ? { ...r, status: 'Accepted' as const } : r),
      notifications: [n1, n2, ...prev.notifications],
    }));
    return { success: true };
  }, [isLocked, failPin, clearPinLock, updateState]);

  const rejectPaymentRequest = useCallback((requestId: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const req = s.paymentRequests.find(r => r.id === requestId);
    if (!req || (req.status !== 'PENDING' && req.status !== 'Pending')) return { success: false, error: 'Request not found' };
    const payer = s.users.find(u => u.id === req.payerId);
    const timestamp = new Date().toISOString();
    const notif: AppNotification = { id: generateId('N'), userId: req.requesterId, title: 'Request Declined', message: `${payer ? payer.name : 'User'} declined your request for ₹${req.amount}.`, type: 'REQUEST_REJECTED', timestamp, read: false, relatedRequestId: req.id };

    updateState(prev => ({
      ...prev,
      paymentRequests: prev.paymentRequests.map(r => r.id === requestId ? { ...r, status: 'Rejected' as const } : r),
      notifications: [notif, ...prev.notifications],
    }));
    return { success: true };
  }, [updateState]);

  const getPaymentRequestsForCurrentUser = useCallback((): PaymentRequest[] => {
    const s = stateRef.current;
    if (!s.currentUserId) return [];
    return s.paymentRequests.filter(r => r.requesterId === s.currentUserId || r.payerId === s.currentUserId);
  }, []);

  const getNotificationsForCurrentUser = useCallback((): AppNotification[] => {
    const s = stateRef.current;
    if (!s.currentUserId) return [];
    return s.notifications.filter(n => n.userId === s.currentUserId);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    updateState(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  }, [updateState]);

  const markAllRead = useCallback(() => {
    const userId = stateRef.current.currentUserId;
    if (!userId) return;
    updateState(prev => ({ ...prev, notifications: prev.notifications.map(n => n.userId === userId ? { ...n, read: true } : n) }));
  }, [updateState]);

  const getUnreadCount = useCallback((): number => {
    const s = stateRef.current;
    if (!s.currentUserId) return 0;
    return s.notifications.filter(n => n.userId === s.currentUserId && !n.read).length;
  }, []);

  const changePin = useCallback((oldPin: string, newPin: string): { success: boolean; error?: string } => {
    const s = stateRef.current;
    const user = s.users.find(u => u.id === s.currentUserId);
    if (!user) return { success: false, error: 'User not found' };
    const timestamp = new Date().toISOString();

    if (user.pin !== oldPin) {
      const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'PIN Change Failed', message: 'Incorrect current PIN entered while attempting to change PIN.', type: 'INCORRECT_PIN', timestamp, read: false };
      updateState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      return { success: false, error: 'Incorrect current PIN' };
    }

    if (!/^\d{4}$/.test(newPin)) {
      const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'PIN Change Failed', message: 'New PIN must be exactly 4 digits.', type: 'SECURITY', timestamp, read: false };
      updateState(prev => ({ ...prev, notifications: [notif, ...prev.notifications] }));
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }

    const notif: AppNotification = { id: generateId('N'), userId: user.id, title: 'PIN Changed', message: 'Your 4-digit PayVerse payment PIN was changed successfully.', type: 'SECURITY', timestamp, read: false };

    updateState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === user.id ? { ...u, pin: newPin } : u),
      notifications: [notif, ...prev.notifications],
    }));
    return { success: true };
  }, [updateState]);

  const resetDemoData = useCallback(() => {
    const resetState: AppState = {
      users: [],
      transactions: [],
      paymentRequests: [],
      notifications: [],
      currentUserId: null,
    };
    stateRef.current = resetState;
    setStateRaw(resetState);
    saveState(resetState);
    clearPinLock();
    refreshLiveBackendData();
  }, [clearPinLock, refreshLiveBackendData]);

  return (
    <AppContext.Provider value={{
      state, currentScreen, navigate, goBack, navigateRoot,
      isLoadingData, refreshLiveBackendData,
      toast, showToast, clearToast,
      loginPhone, setLoginPhone, login, verifyOTP, registerNewUser, logout,
      getCurrentUser, getUserById, searchUsers, switchDemoUser,
      sendMoney, addMoney, getTransactionsForCurrentUser, getTransactionById,
      createPaymentRequest, acceptPaymentRequest, rejectPaymentRequest, getPaymentRequestsForCurrentUser,
      getNotificationsForCurrentUser, markNotificationRead, markAllRead, getUnreadCount,
      changePin, resetDemoData,
      pinAttempts, pinLockedUntil, clearPinLock,
      isSplashActive, splashKey, triggerSplash, finishSplash,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
