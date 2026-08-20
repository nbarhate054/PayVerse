import { useApp, type ScreenName } from '../context';
import { fmt, fmtDateGroupKey, fmtTime } from '../utils';
import {
  IconPlusCircle, IconSend, IconReceive, IconUtensils,
  IconCar, IconShoppingBag, IconGamepad, IconBook
} from '../components/Icons';

export default function WalletScreen() {
  const app = useApp();
  const user = app.getCurrentUser();
  const allTx = app.getTransactionsForCurrentUser();

  if (!user) return null;

  const totalAdded = allTx.filter(t => t.type === 'ADD_MONEY').reduce((s, t) => s + t.amount, 0);
  const totalSent = allTx.filter(t => t.type === 'P2P_TRANSFER' && t.senderId === user.id).reduce((s, t) => s + t.amount, 0);
  const totalReceived = allTx.filter(t => t.type === 'P2P_TRANSFER' && t.receiverId === user.id).reduce((s, t) => s + t.amount, 0);

  const spendingCategories = [
    { name: 'Food & Snacks', icon: <IconUtensils size={18} className="text-amber-600" />, amount: 1250, total: 3500, color: 'bg-amber-500' },
    { name: 'Travel & Metro', icon: <IconCar size={18} className="text-blue-600" />, amount: 640, total: 3500, color: 'bg-blue-500' },
    { name: 'Shopping', icon: <IconShoppingBag size={18} className="text-purple-600" />, amount: 900, total: 3500, color: 'bg-purple-500' },
    { name: 'Entertainment', icon: <IconGamepad size={18} className="text-pink-600" />, amount: 450, total: 3500, color: 'bg-pink-500' },
    { name: 'Education & Books', icon: <IconBook size={18} className="text-emerald-600" />, amount: 300, total: 3500, color: 'bg-emerald-500' },
  ];

  const walletActions: { label: string; icon: React.ReactNode; color: string; screen: ScreenName }[] = [
    { label: 'Add Money', icon: <IconPlusCircle size={22} />, color: 'bg-blue-600 text-white', screen: 'add-money' },
    { label: 'Send Money', icon: <IconSend size={22} />, color: 'bg-blue-50 text-blue-600 border border-blue-200', screen: 'send-money' },
    { label: 'Request', icon: <IconReceive size={22} />, color: 'bg-indigo-50 text-indigo-600 border border-indigo-200', screen: 'request-money' },
  ];

  const recent = allTx.slice(0, 8);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-white font-black text-xl">My Wallet</h1>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Teen Wallet</span>
        </div>

        <div className="bg-white/15 backdrop-blur rounded-3xl p-5 border border-white/20 text-white">
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-4xl font-black">{fmt(user.balance)}</p>
          <p className="text-blue-200 text-xs mt-2">PayVerse ID: <strong>{user.id}</strong></p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[
            { label: 'Total Added', value: totalAdded, color: 'text-green-300', bg: 'bg-green-500/20' },
            { label: 'Total Sent', value: totalSent, color: 'text-red-300', bg: 'bg-red-500/20' },
            { label: 'Received', value: totalReceived, color: 'text-blue-200', bg: 'bg-blue-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 border border-white/10`}>
              <p className="text-blue-200 text-[10px] font-medium">{label}</p>
              <p className={`${color} font-bold text-xs sm:text-sm mt-0.5`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Wallet Actions */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3">
          {walletActions.map(({ label, icon, color, screen }) => (
            <button
              key={screen}
              onClick={() => app.navigate(screen)}
              className={`${color} rounded-2xl py-3.5 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform`}
            >
              {icon}
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spending Overview */}
      <div className="px-5 mb-5">
        <h3 className="text-gray-900 font-bold text-sm mb-3">Spending Overview</h3>
        {totalSent === 0 ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-gray-500 font-semibold text-xs">No spending activity recorded yet</p>
            <p className="text-gray-400 text-[11px] mt-0.5">Send or add money to see your spending breakdown.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3.5">
            {spendingCategories.map(cat => {
              const pct = totalSent > 0 ? Math.round((cat.amount / totalSent) * 100) : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-800 flex items-center gap-2">
                      {cat.icon} {cat.name}
                    </span>
                    <span className="font-bold text-gray-900">{fmt(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900 font-bold text-sm">Wallet Activity</h3>
          <button onClick={() => app.navigateRoot('history')} className="text-blue-600 text-xs font-bold hover:underline">See All</button>
        </div>

        {app.isLoadingData ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-4 space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 bg-slate-200 rounded-full" />
                    <div className="w-16 h-2.5 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="w-14 h-4 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-gray-900 font-bold text-sm mb-1">No transactions yet</p>
            <p className="text-gray-400 text-xs">No transactions yet. Send or request money to get started!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {recent.map((tx, i) => {
              const isSender = tx.senderId === user.id;
              const isAdd = tx.type === 'ADD_MONEY';
              const otherName = isAdd ? `Added via ${tx.paymentMethod}` : isSender ? tx.receiverName : tx.senderName;
              const credit = isAdd || !isSender;

              return (
                <button
                  key={tx.transactionId}
                  onClick={() => app.navigate('transaction-details', { transactionId: tx.transactionId })}
                  className={`w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left ${
                    i !== recent.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                      {credit ? <IconReceive size={16} className="text-green-600" /> : <IconSend size={16} />}
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-xs">{otherName}</p>
                      <p className="text-gray-400 text-[11px]">{fmtTime(tx.timestamp)} • {tx.note || 'Payment'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-xs ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                      {credit ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase">{tx.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
