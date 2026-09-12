import { useState } from 'react';
import { useApp } from '../context';
import type { ScreenName } from '../context';
import { fmt, initials, avatarColor, fmtTime } from '../utils';
import logoSvg from '../assets/logo.svg';
import MyQRModal from '../components/MyQRModal';
import ScanPayModal from '../components/ScanPayModal';
import {
  IconBell, IconScan, IconSend, IconReceive, IconPlusCircle,
  IconEye, IconEyeOff, IconPlus,
} from '../components/Icons';

export default function HomeScreen() {
  const app = useApp();
  const user = app.getCurrentUser();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanPay, setShowScanPay] = useState(false);

  if (!user) return null;

  const allUserTransactions = app.getTransactionsForCurrentUser();
  const transactions = allUserTransactions.slice(0, 5);
  const unread = app.getUnreadCount();

  // Determine user age / account type
  const userAge = user.age !== undefined ? user.age : 17;
  const isTeen = userAge < 18 || user.userType === 'teen';

  const quickActions: { icon: React.ReactNode; label: string; color: string; screen: ScreenName }[] = [
    { icon: <IconScan size={26} />, label: 'Scan & Pay', color: 'bg-blue-600 text-white shadow-blue-200', screen: 'qr-pay' },
    { icon: <IconSend size={26} />, label: 'Send Money', color: 'bg-blue-50 text-blue-600 border border-blue-200/80', screen: 'send-money' },
    { icon: <IconReceive size={26} />, label: 'Request', color: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80', screen: 'request-money' },
    { icon: <IconPlusCircle size={26} />, label: 'Add Money', color: 'bg-slate-100 text-slate-700 border border-slate-200/80', screen: 'add-money' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-10 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 bg-transparent border-none p-0">
          <img
            src={logoSvg}
            alt="PayVerse"
            className="h-9 sm:h-10 w-auto object-contain border-none shadow-none outline-none bg-transparent block pointer-events-none select-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* My QR Button */}
          <button
            onClick={() => setShowMyQR(true)}
            className="p-2 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-100/80 active:scale-95"
            title="My QR Code"
          >
            <span className="text-sm">📱</span>
            <span>My QR</span>
          </button>
          {/* Notification Bell */}
          <button onClick={() => app.navigate('notifications')} className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors">
            <IconBell size={20} className="text-slate-700" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {/* Profile Avatar */}
          <button onClick={() => app.navigateRoot('profile')} className="p-0.5 rounded-2xl active:scale-95 transition-transform">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center shadow-sm`}>
              <span className="text-white font-bold text-xs">{initials(user.name)}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="px-5 pt-5 pb-2">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-5 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Available Balance</p>
            <button onClick={() => setBalanceVisible(v => !v)} className="p-1 text-blue-200 hover:text-white transition-colors">
              {balanceVisible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
            </button>
          </div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-3xl font-black tracking-tight">{balanceVisible ? fmt(user.balance) : '₹ ••••••'}</span>
            <button
              onClick={() => app.navigate('add-money')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95"
            >
              <IconPlus size={14} />
              <span>Add Money</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-blue-200 text-xs border-t border-white/15 pt-3">
            <span>PayVerse ID: <strong>{user.id}</strong></span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              {isTeen ? 'TEEN ACCOUNT' : 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Quick Actions */}
      <div className="px-5 py-3">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ icon, label, color, screen }) => (
            <button
              key={screen}
              onClick={() => {
                if (screen === 'qr-pay') {
                  setShowScanPay(true);
                } else {
                  app.navigate(screen);
                }
              }}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shadow-md`}>
                {icon}
              </div>
              <span className="text-gray-700 text-[11px] font-semibold tracking-tight text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-900 font-bold text-base">Recent Activity</h2>
          <button
            onClick={() => app.navigateRoot('history')}
            className="text-blue-600 text-xs font-bold hover:underline"
          >
            See All
          </button>
        </div>

        {app.isLoadingData ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-4 space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 bg-slate-200 rounded-full" />
                    <div className="w-16 h-2.5 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="w-14 h-4 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
            <div className="text-3xl mb-2">💸</div>
            <p className="text-gray-900 font-bold text-sm mb-1">No transactions yet</p>
            <p className="text-gray-400 text-xs">No transactions yet. Send or request money to get started!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {transactions.map((tx, i) => {
              const isSender = tx.senderId === user.id;
              const isAdd = tx.type === 'ADD_MONEY';
              const otherName = isAdd ? `Added via ${tx.paymentMethod}` : isSender ? tx.receiverName : tx.senderName;
              const credit = isAdd || !isSender;

              return (
                <button
                  key={tx.transactionId}
                  onClick={() => app.navigate('transaction-details', { transactionId: tx.transactionId })}
                  className={`w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left ${i !== transactions.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(otherName)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-xs">{initials(otherName)}</span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-xs">{otherName}</p>
                      <p className="text-gray-400 text-[11px]">{fmtTime(tx.timestamp)} • {tx.note || 'Payment'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                      {credit ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{tx.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modals */}
      <MyQRModal
        user={user}
        isOpen={showMyQR}
        onClose={() => setShowMyQR(false)}
      />

      <ScanPayModal
        isOpen={showScanPay}
        onClose={() => setShowScanPay(false)}
        onSuccess={(rec) => {
          setShowScanPay(false);
          app.navigate('send-money', {
            recipientId: rec.payverseId || rec.id,
            recipientName: rec.name,
            recipientPhone: rec.phone,
          });
        }}
      />
    </div>
  );
}
