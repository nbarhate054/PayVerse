import type { JSX } from 'react';
import { AppProvider, useApp } from './context';
import type { ScreenName } from './context';
import { LoginScreen, OTPScreen } from './screens/Auth';
import HomeScreen from './screens/Home';
import WalletScreen from './screens/Wallet';
import SendMoneyScreen from './screens/SendMoney';
import AddMoneyScreen from './screens/AddMoney';
import RequestMoneyScreen from './screens/RequestMoney';
import QRPayScreen from './screens/QRPay';
import HistoryScreen from './screens/History';
import TransactionDetailsScreen from './screens/TransactionDetails';
import NotificationsScreen from './screens/Notifications';
import ProfileScreen from './screens/Profile';
import ChangePINScreen from './screens/ChangePIN';
import PaymentsScreen from './screens/Payments';

import { IconHome, IconWallet, IconHistory, IconUser } from './components/Icons';

const NAV_ITEMS: { key: ScreenName; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    key: 'home',
    label: 'Home',
    icon: (active) => <IconHome size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />,
  },
  {
    key: 'wallet',
    label: 'Wallet',
    icon: (active) => <IconWallet size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />,
  },
  {
    key: 'history',
    label: 'Activity',
    icon: (active) => <IconHistory size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (active) => <IconUser size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />,
  },
];

const ROOT_SCREENS = new Set<ScreenName>(['home', 'wallet', 'history', 'profile']);

function BottomNav() {
  const app = useApp();
  const current = app.currentScreen.name;
  const activeRoot = ROOT_SCREENS.has(current) ? current : 'home';

  return (
    <nav className="bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const isActive = key === activeRoot;
          return (
            <button
              key={key}
              onClick={() => app.navigateRoot(key)}
              className="flex flex-col items-center gap-0.5 min-w-[52px] active:scale-90 transition-transform py-1"
            >
              {icon(isActive)}
              {key !== 'payments' && (
                <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ScreenRouter() {
  const { currentScreen, navigateRoot, getCurrentUser } = useApp();
  const currentUser = getCurrentUser();
  const isFullyOnboarded = !!(currentUser && (currentUser.onboardingStatus === 'completed' || currentUser.isOnboarded));
  const isPublicRoute = currentScreen.name === 'login' || currentScreen.name === 'otp';

  if (!isPublicRoute && !isFullyOnboarded) {
    return <LoginScreen />;
  }

  const screenComponents: Partial<Record<ScreenName, JSX.Element>> = {
    login: <LoginScreen />,
    otp: <OTPScreen />,
    home: <HomeScreen />,
    wallet: <WalletScreen />,
    'send-money': <SendMoneyScreen />,
    'add-money': <AddMoneyScreen />,
    'request-money': <RequestMoneyScreen />,
    'qr-pay': <QRPayScreen />,
    history: <HistoryScreen />,
    'transaction-details': <TransactionDetailsScreen />,
    notifications: <NotificationsScreen />,
    profile: <ProfileScreen />,
    'change-pin': <ChangePINScreen />,
    payments: <PaymentsScreen />,
  };

  const Component = screenComponents[currentScreen.name];

  if (!Component) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-50 p-6 text-center">
        <div className="text-4xl mb-3">❓</div>
        <h2 className="text-gray-900 font-bold text-lg mb-1">Page Not Found</h2>
        <p className="text-gray-500 text-xs mb-6">The requested route "{currentScreen.name}" does not exist.</p>
        <button
          onClick={() => navigateRoot(isFullyOnboarded ? 'home' : 'login')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md active:scale-95 transition-transform"
        >
          {isFullyOnboarded ? 'Return to Home' : 'Go to Login'}
        </button>
      </div>
    );
  }

  return Component;
}

import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastBanner } from './components/Toast';

function AppShell() {
  const { currentScreen, getCurrentUser, isSplashActive, splashKey, finishSplash, toast, clearToast } = useApp();
  const currentUser = getCurrentUser();
  const isFullyOnboarded = !isSplashActive && !!(currentUser && (currentUser.onboardingStatus === 'completed' || currentUser.isOnboarded));
  const showNav = isFullyOnboarded && ROOT_SCREENS.has(currentScreen.name);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col justify-center items-center p-0 sm:p-6 overflow-x-hidden box-border mx-auto relative">
      <ToastBanner toast={toast} onClose={clearToast} />
      {isSplashActive ? (
        <div className="w-full max-w-[430px] min-h-[100vh] min-h-[100dvh] sm:min-h-[800px] sm:max-h-[92vh] sm:rounded-3xl flex flex-col bg-white shadow-2xl relative mx-auto box-border overflow-hidden items-center justify-center">
          <SplashScreen key={splashKey} duration={1800} onFinish={finishSplash} />
        </div>
      ) : (
        <div className="w-full max-w-[430px] min-h-[100vh] min-h-[100dvh] sm:min-h-[800px] sm:max-h-[92vh] sm:rounded-3xl flex flex-col bg-slate-50 shadow-2xl relative mx-auto box-border overflow-hidden">
          <div className="flex-1 relative flex flex-col w-full min-h-0 box-border overflow-y-auto">
            <ScreenRouter />
          </div>
          {showNav && <BottomNav />}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
