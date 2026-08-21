import { useState } from 'react';
import { useApp } from '../context';
import type { ScreenName } from '../context';
import { fmt, initials, avatarColor, fmtTime } from '../utils';
import logoSvg from '../assets/logo.svg';
import MyQRModal from '../components/MyQRModal';
import ScanPayModal from '../components/ScanPayModal';
import {
  IconBell, IconScan, IconSend, IconReceive, IconPlusCircle,
  IconEye, IconEyeOff, IconHeadphones, IconGamepad, IconTrophy,
  IconTarget, IconAward, IconFlame, IconCoins, IconUsers, IconPlus,
  IconPieChart, IconShield,
} from '../components/Icons';

export default function HomeScreen() {
  const app = useApp();
  const user = app.getCurrentUser();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showRewards, setShowRewards] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanPay, setShowScanPay] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  // Teen Goals
  const [teenGoals, setTeenGoals] = useState<{ id: string; name: string; icon: string; current: number; target: number }[]>([]);

  // Adult Goals
  const [adultGoals, setAdultGoals] = useState<{ id: string; name: string; icon: string; current: number; target: number }[]>([]);

  if (!user) return null;

  const allUserTransactions = app.getTransactionsForCurrentUser();
  const transactions = allUserTransactions.slice(0, 5);
  const unread = app.getUnreadCount();

  // Determine user age / account type
  const userAge = user.age !== undefined ? user.age : 17;
  const isTeen = userAge < 18 || user.userType === 'teen';

  // Calculate actual user financial statistics
  const moneyAdded = allUserTransactions
    .filter(t => t.type === 'ADD_MONEY')
    .reduce((sum, t) => sum + t.amount, 0);

  const moneySent = allUserTransactions
    .filter(t => t.type === 'P2P_TRANSFER' && t.senderId === user.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthSpending = moneySent;

  const activeGoals = isTeen ? teenGoals : adultGoals;

  const renderGoalIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'headphones': return <IconHeadphones size={20} className="text-blue-600" />;
      case 'gamepad': return <IconGamepad size={20} className="text-indigo-600" />;
      case 'trophy': return <IconTrophy size={20} className="text-emerald-600" />;
      case 'shield': return <IconShield size={20} className="text-blue-600" />;
      case 'travel': return <span className="text-sm">✈️</span>;
      case 'phone': return <span className="text-sm">📱</span>;
      case 'education': return <span className="text-sm">🎓</span>;
      case 'home': return <span className="text-sm">🏠</span>;
      default: return <IconTarget size={20} className="text-blue-600" />;
    }
  };

  const quickActions: { icon: React.ReactNode; label: string; color: string; screen: ScreenName }[] = [
    { icon: <IconScan size={26} />, label: 'Scan & Pay', color: 'bg-blue-600 text-white shadow-blue-200', screen: 'qr-pay' },
    { icon: <IconSend size={26} />, label: 'Send Money', color: 'bg-blue-50 text-blue-600 border border-blue-200/80', screen: 'send-money' },
    { icon: <IconReceive size={26} />, label: 'Request', color: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80', screen: 'request-money' },
    { icon: <IconPlusCircle size={26} />, label: 'Add Money', color: 'bg-slate-100 text-slate-700 border border-slate-200/80', screen: 'add-money' },
  ];

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget || parseFloat(newGoalTarget) <= 0) return;
    const targetNum = parseFloat(newGoalTarget);
    const newGoalObj = {
      id: String(Date.now()),
      name: newGoalName.trim(),
      icon: 'target',
      current: 0,
      target: targetNum,
    };

    if (isTeen) {
      setTeenGoals(prev => [...prev, newGoalObj]);
    } else {
      setAdultGoals(prev => [...prev, newGoalObj]);
    }
    setNewGoalName('');
    setNewGoalTarget('');
    setShowCreateGoal(false);
  };

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
      <div className="px-5 py-4">
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

      {/* DYNAMIC DASHBOARD CONTENT */}

      {/* ------------------------------------------------------------- */}
      {/* 1. ADULT DASHBOARD SECTIONS */}
      {/* ------------------------------------------------------------- */}
      {!isTeen && (
        <>
          {/* Money Overview */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                  <IconPieChart size={18} className="text-blue-600" />
                  Money Overview
                </h3>
                <span className="text-[11px] font-semibold text-gray-400">Account Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Money Added</p>
                  <p className="text-green-600 font-black text-xs sm:text-sm">{fmt(moneyAdded)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Money Sent</p>
                  <p className="text-gray-900 font-black text-xs sm:text-sm">{fmt(moneySent)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Spending</p>
                  <p className="text-blue-600 font-black text-xs sm:text-sm">{fmt(thisMonthSpending)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Spending Insights */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-bold text-sm mb-3">Spending Insights</h3>
              {allUserTransactions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-gray-500 font-semibold text-xs">No spending insights yet</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Categorized breakdown will appear after your first transaction.</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { icon: '🍔', label: 'Food' },
                    { icon: '🛍️', label: 'Shopping' },
                    { icon: '💡', label: 'Bills' },
                    { icon: '✈️', label: 'Travel' },
                    { icon: '📦', label: 'Other' },
                  ].map(cat => (
                    <div key={cat.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-2">
                      <span className="text-base block mb-1">{cat.icon}</span>
                      <span className="text-gray-700 font-semibold text-[10px] block">{cat.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Adult Savings */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-bold text-sm">Savings</h3>
                <button
                  onClick={() => setShowCreateGoal(true)}
                  className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-0.5"
                >
                  <IconPlus size={14} /> Create Goal
                </button>
              </div>

              {activeGoals.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-gray-500 font-semibold text-xs">No savings goals created yet</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Click 'Create Goal' to start saving for your target.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {activeGoals.map(g => {
                    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                    return (
                      <div key={g.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-1 shadow-2xs">
                          {renderGoalIcon(g.icon)}
                        </div>
                        <p className="text-gray-900 font-bold text-[11px] truncate">{g.name}</p>
                        <p className="text-gray-500 text-[10px] mb-1 font-semibold">{pct}% saved</p>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-bold text-sm">Upcoming Payments</h3>
                <span className="text-[11px] text-gray-400 font-medium">Bills</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-gray-500 font-semibold text-xs">No upcoming payments</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Scheduled utility bills and recharges will appear here.</p>
              </div>
            </div>
          </div>

          {/* Split Expenses (Adult) */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <IconUsers size={20} />
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-xs">Split Expenses</p>
                  <p className="text-gray-500 text-[11px]">Split bills with friends, family or groups</p>
                </div>
              </div>
              <button
                onClick={() => app.navigate('request-money')}
                className="bg-white border border-blue-200 text-blue-600 font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs active:scale-95 transition-transform"
              >
                Split Now
              </button>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TEEN DASHBOARD SECTIONS */}
      {/* ------------------------------------------------------------- */}
      {isTeen && (
        <>
          {/* Teen Hub Section */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCoins size={20} className="text-blue-600" />
                  <h3 className="text-gray-900 font-bold text-sm">Pocket Money Tracker</h3>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Monthly</span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-gray-500">Received this month</span>
                  <span className="text-gray-900">{fmt(moneyAdded)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full w-[100%]" />
                </div>
                <p className="text-gray-400 text-[11px] mt-1.5 font-medium">
                  Live Balance: {fmt(user.balance)}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconTarget size={18} className="text-indigo-600" />
                    <h4 className="text-gray-900 font-bold text-xs">Savings Goals</h4>
                  </div>
                  <button
                    onClick={() => setShowCreateGoal(true)}
                    className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-0.5"
                  >
                    <IconPlus size={14} /> Create Goal
                  </button>
                </div>

                {teenGoals.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                    <p className="text-gray-500 font-semibold text-xs">No savings goals yet</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Create your first goal to track your savings!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {teenGoals.map(g => {
                      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                      return (
                        <div key={g.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center">
                          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-1 shadow-2xs">
                            {renderGoalIcon(g.icon)}
                          </div>
                          <p className="text-gray-900 font-bold text-[11px] truncate">{g.name}</p>
                          <p className="text-gray-500 text-[10px] mb-1 font-semibold">{pct}% saved</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Split Bill Card */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between bg-blue-50/60 rounded-2xl p-3 border-blue-100/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <IconUsers size={18} />
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-xs">Split Bill with Friends</p>
                    <p className="text-gray-500 text-[11px]">Divide dinner, movie & party costs easily</p>
                  </div>
                </div>
                <button
                  onClick={() => app.navigate('request-money')}
                  className="bg-white border border-blue-200 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-transform"
                >
                  Split Now
                </button>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="px-5 py-2">
            <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <IconAward size={22} />
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-xs">Smart Saver Badge 🏆</p>
                  <p className="text-gray-500 text-[11px]">Live Account Active</p>
                </div>
              </div>
              <button onClick={() => setShowRewards(true)} className="text-blue-600 text-xs font-bold hover:underline">
                View
              </button>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity (Both Teen & Adult) */}
      <div className="px-5 py-3 mb-6">
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

      {/* Rewards Modal (Teen) */}
      {showRewards && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconTrophy size={32} />
            </div>
            <h3 className="text-gray-900 font-black text-lg mb-1">Teen Badges & Rewards</h3>
            <p className="text-gray-500 text-xs mb-4">Complete healthy money habits to unlock badges!</p>
            <div className="space-y-2 text-left mb-5">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3">
                <IconFlame size={22} className="text-amber-600" />
                <div>
                  <p className="text-gray-900 font-bold text-xs">First Payment ✓</p>
                  <p className="text-gray-500 text-[10px]">Made your first PayVerse payment</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-3">
                <IconTarget size={22} className="text-blue-600" />
                <div>
                  <p className="text-gray-900 font-bold text-xs">Smart Saver</p>
                  <p className="text-gray-500 text-[10px]">Saved ₹3,500 towards headphones goal</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRewards(false)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl text-xs active:scale-95 transition-transform"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-left shadow-2xl animate-scale-in">
            <h3 className="text-gray-900 font-black text-lg mb-1">Create Savings Goal</h3>
            <p className="text-gray-500 text-xs mb-4">Set a target to save money for things you love</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Goal Name</label>
                <input
                  type="text"
                  placeholder={isTeen ? 'e.g. Bicycle, Laptop' : 'e.g. Vacation, New Phone'}
                  value={newGoalName}
                  onChange={e => setNewGoalName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Target Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={newGoalTarget}
                  onChange={e => setNewGoalTarget(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowCreateGoal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">
                Cancel
              </button>
              <button onClick={handleAddGoal} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95">
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}

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
