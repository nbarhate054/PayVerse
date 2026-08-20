import { useApp } from '../context';
import { fmt, fmtDate, fmtTime } from '../utils';

export default function TransactionDetailsScreen() {
  const app = useApp();
  const txId = app.currentScreen.params?.transactionId ?? '';
  const tx = app.getTransactionById(txId);
  const user = app.getCurrentUser()!;

  if (!tx) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-gray-500">Transaction not found</p>
        <button onClick={app.goBack} className="text-blue-600 mt-4">Go back</button>
      </div>
    );
  }

  const isSent = tx.senderId === user.id;
  const isAdd = tx.type === 'ADD_MONEY';
  const credit = isAdd || !isSent;

  const handleShare = () => {
    const text = `PayVerse Receipt\nTransaction ID: ${tx.transactionId}\nStatus: ${tx.status}\nAmount: ${fmt(tx.amount)}\nSender: ${tx.senderName} (${tx.senderId})\nReceiver: ${tx.receiverName} (${tx.receiverId})\nDate: ${fmtDate(tx.timestamp)} ${fmtTime(tx.timestamp)}\nPayment Method: ${tx.paymentMethod}\nNote: ${tx.note || 'None'}`;
    if (navigator.share) {
      navigator.share({ title: 'PayVerse Receipt', text });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Receipt copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const text = `======================================\n           PAYVERSE RECEIPT           \n======================================\nStatus:         Successful\nTransaction ID: ${tx.transactionId}\nAmount:         ${fmt(tx.amount)}\nSender:         ${tx.senderName} (${tx.senderId})\nReceiver:       ${tx.receiverName} (${tx.receiverId})\nPayment Method: ${tx.paymentMethod}\nDate:           ${fmtDate(tx.timestamp)}\nTime:           ${fmtTime(tx.timestamp)}\nNote:           ${tx.note || 'None'}\n======================================\nThank you for using PayVerse!`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayVerse_Receipt_${tx.transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={app.goBack} className="p-2 rounded-xl hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Transaction Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Status header */}
        <div className="bg-white rounded-3xl p-6 text-center border border-gray-100 shadow-sm mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${credit ? 'bg-green-100' : 'bg-blue-100'}`}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={credit ? '#22c55e' : '#3b82f6'} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-green-600 text-sm font-semibold">Successful</span>
          </div>
          <p className={`text-4xl font-black mb-1 ${credit ? 'text-green-600' : 'text-gray-900'}`}>
            {credit ? '+' : '-'}{fmt(tx.amount)}
          </p>
          <p className="text-gray-500 text-sm">
            {isAdd ? `Added via ${tx.paymentMethod}` : isSent ? `Sent to ${tx.receiverName}` : `Received from ${tx.senderName}`}
          </p>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Transaction Info</p>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            {[
              { label: 'Status', value: tx.status === 'SUCCESS' ? 'Successful ✓' : 'Failed' },
              { label: 'Amount', value: fmt(tx.amount) },
              { label: 'Sender', value: isAdd ? tx.senderName : `${tx.senderName} (${tx.senderId})` },
              { label: 'Receiver', value: `${tx.receiverName} (${tx.receiverId})` },
              { label: 'PayVerse ID', value: isSent ? tx.receiverId : tx.senderId },
              { label: 'Transaction ID', value: tx.transactionId },
              { label: 'Date', value: fmtDate(tx.timestamp) },
              { label: 'Time', value: fmtTime(tx.timestamp) },
              { label: 'Payment Method', value: tx.paymentMethod },
              { label: 'Note', value: tx.note || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="py-3.5 flex justify-between items-start gap-4">
                <span className="text-gray-500 text-sm flex-shrink-0">{label}</span>
                <span className={`text-sm font-semibold text-right flex-1 ${label === 'Transaction ID' || label === 'PayVerse ID' ? 'text-blue-600 font-mono text-xs' : 'text-gray-900'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <button onClick={handleShare} className="flex-1 border-2 border-blue-600 text-blue-600 font-bold py-3.5 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          <button onClick={handleDownload} className="flex-1 border-2 border-indigo-600 text-indigo-600 font-bold py-3.5 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
        <button onClick={app.goBack} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform text-sm">
          Done
        </button>
      </div>
    </div>
  );
}
