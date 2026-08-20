import { useApp, type ScreenName } from '../context';
import { fmt } from '../utils';

export default function PaymentsScreen() {
  const app = useApp();
  const user = app.getCurrentUser();

  if (!user) return null;

  const actions: { icon: string; label: string; sub: string; color: string; screen: ScreenName }[] = [
    { icon: '↗️', label: 'Send Money', sub: 'Pay anyone instantly', color: 'from-blue-500 to-blue-700', screen: 'send-money' },
    { icon: '📥', label: 'Request Money', sub: 'Ask friends to pay you', color: 'from-violet-500 to-purple-700', screen: 'request-money' },
    { icon: '📷', label: 'Scan & Pay', sub: 'Scan a QR code to pay', color: 'from-orange-400 to-amber-500', screen: 'qr-pay' },
    { icon: '➕', label: 'Add Money', sub: 'Top up your wallet', color: 'from-green-500 to-emerald-600', screen: 'add-money' },
  ];

  const pendingRequests = app.getPaymentRequestsForCurrentUser().filter(r => r.payerId === user.id && (r.status === 'Pending' || r.status === 'PENDING'));

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-5 pt-14 pb-7">
        <h1 className="text-white font-bold text-xl mb-1">Payments</h1>
        <p className="text-blue-200 text-sm">Balance: <strong className="text-white">{fmt(user.balance)}</strong></p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ icon, label, sub, color, screen }) => (
            <button
              key={screen}
              onClick={() => app.navigate(screen)}
              className={`bg-gradient-to-br ${color} p-4 rounded-2xl text-left active:scale-95 transition-transform shadow-md`}
            >
              <div className="text-2xl mb-3">{icon}</div>
              <p className="text-white font-bold text-sm">{label}</p>
              <p className="text-white/70 text-xs mt-0.5">{sub}</p>
            </button>
          ))}
        </div>

        {/* Pending payment requests */}
        {pendingRequests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">Pending Requests</p>
              <button onClick={() => app.navigate('request-money')} className="text-blue-600 text-sm font-semibold">View All</button>
            </div>
            <div className="space-y-2">
              {pendingRequests.slice(0, 3).map(req => (
                <button
                  key={req.id}
                  onClick={() => app.navigate('request-money')}
                  className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform text-left"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📥</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold text-sm">{req.requesterName} requests {fmt(req.amount)}</p>
                    {req.note && <p className="text-gray-500 text-xs mt-0.5">"{req.note}"</p>}
                  </div>
                  <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-1 rounded-lg">Pending</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PayVerse ID card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Your PayVerse ID</p>
            <button
              onClick={() => { navigator.clipboard?.writeText(user.id); }}
              className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl font-medium"
            >
              Copy
            </button>
          </div>
          <p className="text-blue-300 font-mono text-base font-bold">{user.id}</p>
          <p className="text-slate-400 text-xs mt-2">Share this ID to receive payments</p>
        </div>
      </div>
    </div>
  );
}
