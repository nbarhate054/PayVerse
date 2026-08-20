import { useState, useRef } from 'react';
import { useApp } from '../context';
import type { User } from '../store';
import { fmt, initials, avatarColor } from '../utils';
import PINInput from '../components/PINInput';

type Step = 'search' | 'amount' | 'confirm' | 'pin' | 'processing' | 'success';

export default function SendMoneyScreen() {
  const app = useApp();
  const user = app.getCurrentUser()!;
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pinError, setPinError] = useState('');
  const [txId, setTxId] = useState('');
  const processingRef = useRef(false);

  const results = app.searchUsers(query);

  const handleSelectRecipient = (u: User) => {
    setRecipient(u);
    setStep('amount');
    setQuery('');
  };

  const handleAmountNext = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    if (n > user.balance) return;
    setStep('confirm');
  };

  const handlePIN = async (pin: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setPinError('');
    setStep('processing');

    try {
      const result = await app.sendMoney({
        receiverId: recipient!.id,
        amount: parseFloat(amount),
        note,
        pin,
        paymentMethod: 'PayVerse Wallet',
      });
      processingRef.current = false;
      if (result.success) {
        setTxId(result.transactionId!);
        setStep('success');
      } else {
        setPinError(result.error ?? 'Transaction failed');
        setStep('pin');
      }
    } catch (err: any) {
      processingRef.current = false;
      setPinError(err.message || 'Transaction failed');
      setStep('pin');
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const isInsufficientBalance = amountNum > user.balance;

  const handleBack = () => {
    if (step === 'search') app.goBack();
    else if (step === 'amount') setStep('search');
    else if (step === 'confirm') setStep('amount');
    else if (step === 'pin') setStep('confirm');
  };

  const BackBtn = () => (
    <button onClick={handleBack} className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
      <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (step === 'processing') {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white px-8">
        <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin-ring mb-6" />
        <p className="text-gray-900 font-bold text-xl">Processing...</p>
        <p className="text-gray-500 text-sm mt-2 animate-pulse-soft">Please wait while we complete your payment</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="animate-scale-in mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}>
                <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="animate-fade-slide-up text-center">
            <p className="text-gray-500 text-sm font-medium mb-1">Payment Successful</p>
            <p className="text-gray-900 text-4xl font-black mb-1">{fmt(amountNum)}</p>
            <p className="text-gray-500 text-sm">Sent to <strong className="text-gray-700">{recipient?.name}</strong></p>
          </div>

          <div className="w-full mt-8 bg-gray-50 rounded-2xl p-4 animate-fade-slide-up space-y-3">
            {[
              { label: 'Transaction ID', value: txId },
              { label: 'Sent to', value: `${recipient?.name} (${recipient?.id})` },
              { label: 'New Balance', value: fmt(user.balance) },
              { label: 'Note', value: note || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-gray-900 text-sm font-semibold text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 flex flex-col gap-3">
          <button
            onClick={() => app.navigate('transaction-details', { transactionId: txId })}
            className="w-full border-2 border-blue-600 text-blue-600 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
          >
            View Transaction
          </button>
          <button
            onClick={() => app.navigateRoot('home')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-slate-50 overflow-x-hidden box-border mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3 w-full max-w-full flex-shrink-0 box-border">
        <BackBtn />
        <h1 className="text-lg font-bold text-gray-900">
          {step === 'search' ? 'Send Money' : step === 'amount' ? 'Enter Amount' : step === 'confirm' ? 'Confirm Payment' : 'Enter PIN'}
        </h1>
        {step !== 'search' && (
          <div className="ml-auto flex gap-1">
            {(['search', 'amount', 'confirm', 'pin'] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-blue-600' : ['search', 'amount', 'confirm', 'pin'].indexOf(step) > i ? 'bg-blue-300' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Search step */}
      {step === 'search' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border mx-auto">
          <div className="relative mb-4 w-full max-w-full box-border">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, PayVerse ID, or mobile"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm box-border"
            />
          </div>

          {query === '' ? (
            <div className="w-full max-w-full box-border">
              <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">All Contacts</p>
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 w-full max-w-full box-border">
                {app.state.users.filter(u => u.id !== app.state.currentUserId).map((u, i, arr) => (
                  <UserRow key={u.id} user={u} onSelect={handleSelectRecipient} last={i === arr.length - 1} />
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="w-full max-w-full box-border">
              <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">{results.length} result{results.length > 1 ? 's' : ''}</p>
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 w-full max-w-full box-border">
                {results.map((u, i) => <UserRow key={u.id} user={u} onSelect={handleSelectRecipient} last={i === results.length - 1} />)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 w-full max-w-full box-border">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 font-medium">No users found</p>
              <p className="text-gray-400 text-sm mt-1">Try searching by name or PayVerse ID</p>
            </div>
          )}
        </div>
      )}

      {/* Amount step */}
      {step === 'amount' && recipient && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border mx-auto">
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mb-6 border border-gray-100 shadow-sm w-full max-w-full box-border">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(recipient.name)} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white font-bold">{initials(recipient.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{recipient.name}</p>
              <p className="text-gray-400 text-xs truncate">{recipient.id}</p>
            </div>
            <button onClick={() => setStep('search')} className="ml-auto text-blue-600 text-sm font-medium flex-shrink-0">Change</button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-4 w-full max-w-full box-border">
            <p className="text-gray-500 text-sm mb-3">Enter Amount</p>
            <div className={`flex items-center border-2 rounded-2xl px-4 py-3 transition-colors min-w-0 w-full box-border ${isInsufficientBalance ? 'border-red-400 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
              <span className="text-2xl font-black text-gray-700 mr-2 flex-shrink-0">₹</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className="flex-1 min-w-0 w-full text-2xl font-black text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
              />
            </div>
            {isInsufficientBalance && <p className="text-red-500 text-xs mt-2">Insufficient balance. Available: {fmt(user.balance)}</p>}
            <p className="text-gray-400 text-xs mt-2">Available: {fmt(user.balance)}</p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4 w-full max-w-full box-border">
            {[100, 200, 500, 1000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} className={`py-2 rounded-xl text-sm font-semibold border transition-colors min-w-0 w-full truncate text-center box-border ${amountNum === v ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
                ₹{v}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6 w-full max-w-full box-border">
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none box-border"
              maxLength={100}
            />
          </div>

          <button
            onClick={handleAmountNext}
            disabled={!amountNum || amountNum <= 0 || isInsufficientBalance}
            className="w-full max-w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed box-border"
          >
            Continue
          </button>
        </div>
      )}

      {/* Confirm step */}
      {step === 'confirm' && recipient && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border mx-auto">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-4 w-full max-w-full box-border">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-center">
              <p className="text-blue-200 text-sm mb-1">You're sending</p>
              <p className="text-white text-4xl font-black">{fmt(amountNum)}</p>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'To', value: recipient.name },
                { label: 'PayVerse ID', value: recipient.id },
                { label: 'Note', value: note || '—' },
                { label: 'From', value: user.name },
                { label: 'Available Balance', value: fmt(user.balance) },
                { label: 'After Payment', value: fmt(user.balance - amountNum) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-gray-900 text-sm font-semibold truncate max-w-[60%] text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep('pin')}
            className="w-full max-w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform box-border"
          >
            Pay {fmt(amountNum)}
          </button>
          <button onClick={() => setStep('amount')} className="w-full mt-3 py-3 text-gray-500 font-medium text-sm">
            Cancel
          </button>
        </div>
      )}

      {/* PIN step */}
      {step === 'pin' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10 w-full max-w-full box-border mx-auto">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-900 font-bold text-lg mb-1 text-center">Enter PayVerse PIN</p>
          <p className="text-gray-500 text-sm mb-8 text-center">Authorise payment of <strong>{fmt(amountNum)}</strong> to {recipient?.name}</p>
          <PINInput onComplete={handlePIN} error={pinError} onReset={() => setPinError('')} />
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onSelect, last }: { user: User; onSelect: (u: User) => void; last: boolean }) {
  return (
    <button
      onClick={() => onSelect(user)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors ${!last ? 'border-b border-gray-50' : ''}`}
    >
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">{initials(user.name)}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="text-gray-900 font-semibold text-sm">{user.name}</p>
        <p className="text-gray-400 text-xs">{user.id} • +91 {user.phone}</p>
      </div>
      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
