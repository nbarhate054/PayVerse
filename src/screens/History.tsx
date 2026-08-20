import { useState } from 'react';
import { useApp } from '../context';
import { fmt, fmtDateGroupKey, fmtTime } from '../utils';
import type { Transaction } from '../store';

type Tab = 'all' | 'sent' | 'received' | 'added' | 'payments';

export default function HistoryScreen() {
  const app = useApp();
  const user = app.getCurrentUser()!;
  const [tab, setTab] = useState<Tab>('all');

  const allTx = app.getTransactionsForCurrentUser();

  const filtered: Transaction[] = (() => {
    switch (tab) {
      case 'sent': return allTx.filter(t => t.type === 'P2P_TRANSFER' && t.senderId === user.id);
      case 'received': return allTx.filter(t => t.type === 'P2P_TRANSFER' && t.receiverId === user.id);
      case 'added': return allTx.filter(t => t.type === 'ADD_MONEY');
      case 'payments': return allTx.filter(t => t.type === 'P2P_TRANSFER');
      default: return allTx;
    }
  })();

  // Group by date
  const groups = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = fmtDateGroupKey(tx.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'received', label: 'Received' },
    { key: 'added', label: 'Added Money' },
    { key: 'payments', label: 'Payments' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => app.goBack()}
            className="p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-gray-700 -ml-1 cursor-pointer relative z-10"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Transaction History</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {label}
              {key === 'all' && allTx.length > 0 && ` (${allTx.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {app.isLoadingData ? (
          <div className="px-4 py-4 space-y-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-3 bg-slate-200 rounded-full" />
                    <div className="w-20 h-2.5 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="w-16 h-4 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-700 font-bold text-base">No transactions yet</p>
            <p className="text-gray-400 text-xs mt-1">
              {tab === 'all' ? 'No transactions yet. Send or request money to get started!' : `No ${tab} transactions yet`}
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-6">
            {Object.entries(groups).map(([dateLabel, txList]) => (
              <div key={dateLabel}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{dateLabel}</p>
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  {txList.map((tx, i) => {
                    const isSent = tx.senderId === user.id;
                    const isAdd = tx.type === 'ADD_MONEY';
                    const credit = isAdd || !isSent;
                    const label = isAdd
                      ? `Added via ${tx.paymentMethod}`
                      : isSent
                      ? `Sent to ${tx.receiverName}`
                      : `From ${tx.senderName}`;

                    return (
                      <button
                        key={tx.transactionId}
                        onClick={() => app.navigate('transaction-details', { transactionId: tx.transactionId })}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors ${i !== txList.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg ${isAdd ? 'bg-green-100' : isSent ? 'bg-red-50' : 'bg-blue-100'}`}>
                          {isAdd ? '💰' : isSent ? '↗️' : '↙️'}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-gray-900 text-sm font-semibold truncate">{label}</p>
                          <p className="text-gray-400 text-xs">{fmtTime(tx.timestamp)} • {tx.paymentMethod}</p>
                          {tx.note && <p className="text-gray-500 text-xs truncate">"{tx.note}"</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                            {credit ? '+' : '-'}{fmt(tx.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            <p className="text-green-600 text-[10px] font-medium">Success</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
