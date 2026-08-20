import { useApp } from '../context';
import { fmtDateGroupKey, fmtTime } from '../utils';
import type { AppNotification } from '../store';

const ICONS: Record<string, string> = {
  PAYMENT_SENT: '↗️',
  PAYMENT_RECEIVED: '↙️',
  MONEY_ADDED: '💰',
  REQUEST_RECEIVED: '📥',
  REQUEST_ACCEPTED: '✅',
  REQUEST_REJECTED: '❌',
  PAYMENT_FAILED: '⚠️',
  INCORRECT_PIN: '🔑',
  SECURITY: '🔐',
};

const COLORS: Record<string, string> = {
  PAYMENT_SENT: 'bg-blue-100 text-blue-700',
  PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
  MONEY_ADDED: 'bg-emerald-100 text-emerald-700',
  REQUEST_RECEIVED: 'bg-violet-100 text-violet-700',
  REQUEST_ACCEPTED: 'bg-green-100 text-green-700',
  REQUEST_REJECTED: 'bg-red-100 text-red-700',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  INCORRECT_PIN: 'bg-amber-100 text-amber-700',
  SECURITY: 'bg-indigo-100 text-indigo-700',
};

export default function NotificationsScreen() {
  const app = useApp();
  const notifications = app.getNotificationsForCurrentUser();
  const unread = notifications.filter(n => !n.read).length;

  const groups = notifications.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const key = fmtDateGroupKey(n.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  const handleClick = (n: AppNotification) => {
    app.markNotificationRead(n.id);
    if (n.relatedTransactionId) {
      app.navigate('transaction-details', { transactionId: n.relatedTransactionId });
    } else if (n.relatedRequestId) {
      app.navigate('request-money');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={app.goBack} className="p-2 rounded-xl hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Notifications</h1>
          {unread > 0 && <p className="text-blue-600 text-xs font-semibold">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={app.markAllRead} className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-gray-900 font-bold text-base">No notifications yet</p>
            <p className="text-gray-400 text-xs mt-1">We'll alert you about transfers, requests, and security events.</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            {Object.entries(groups).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">{dateLabel}</p>
                <div className="space-y-2">
                  {items.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left active:scale-95 ${
                        n.read
                          ? 'bg-white border border-gray-100 shadow-sm'
                          : 'bg-blue-50/80 border border-blue-100 shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg ${COLORS[n.type] ?? 'bg-gray-100'}`}>
                        {ICONS[n.type] ?? '🔔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm ${n.read ? 'text-gray-800 font-semibold' : 'text-gray-900 font-bold'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{fmtTime(n.timestamp)}</span>
                        </div>
                        <p className={`text-xs ${n.read ? 'text-gray-500' : 'text-gray-700 font-medium'} leading-relaxed`}>
                          {n.message}
                        </p>
                        {(n.relatedTransactionId || n.relatedRequestId) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1.5 hover:underline">
                            Tap to view details →
                          </span>
                        )}
                      </div>
                      {!n.read && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5 shadow-sm shadow-blue-300" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
