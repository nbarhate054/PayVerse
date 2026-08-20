import { useState, useRef } from 'react';
import { useApp } from '../context';
import { fmt } from '../utils';
import PINInput from '../components/PINInput';

type Step = 'amount' | 'method' | 'confirm' | 'pin' | 'processing' | 'success';

const PRESETS = [100, 500, 1000, 2000];
const METHODS = [
  { id: 'Bank Account', icon: '🏦', label: 'Bank Account', sub: 'Linked Savings Account' },
  { id: 'Debit / Credit Card', icon: '💳', label: 'Debit / Credit Card', sub: 'Visa / Mastercard / RuPay' },
  { id: 'UPI / Net Banking', icon: '⚡', label: 'UPI / Net Banking', sub: 'Instant Transfer' },
];

export default function AddMoneyScreen() {
  const app = useApp();
  const user = app.getCurrentUser()!;
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [pinError, setPinError] = useState('');
  const [txId, setTxId] = useState('');
  const processingRef = useRef(false);

  const amountNum = parseFloat(amount) || 0;

  const handlePIN = async (pin: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setPinError('');
    setStep('processing');

    try {
      const result = await app.addMoney({ amount: amountNum, paymentMethod: method.id, pin });
      processingRef.current = false;
      if (result.success) {
        setTxId(result.transactionId!);
        setStep('success');
      } else {
        setPinError(result.error ?? 'Failed');
        setStep('pin');
      }
    } catch (err: any) {
      processingRef.current = false;
      setPinError(err.message || 'Failed to add money');
      setStep('pin');
    }
  };

  const BackBtn = ({ onClick }: { onClick?: () => void }) => (
    <button onClick={onClick ?? app.goBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
      <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (step === 'processing') {
    return (
      <div className="flex flex-col h-full w-full max-w-full items-center justify-center bg-white px-4 text-center box-border">
        <div className="w-20 h-20 rounded-full border-4 border-green-100 border-t-green-600 animate-spin-ring mb-6 flex-shrink-0" />
        <p className="text-gray-900 font-bold text-xl">Adding Money...</p>
        <p className="text-gray-500 text-sm mt-2 animate-pulse-soft">Processing via {method.label}</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-white box-border">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 w-full max-w-full box-border">
          <div className="animate-scale-in mb-6 flex-shrink-0">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}>
                <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="animate-fade-slide-up text-center w-full">
            <p className="text-gray-500 text-sm font-medium mb-1">Money Added Successfully!</p>
            <p className="text-gray-900 text-4xl font-black mb-1">{fmt(amountNum)}</p>
            <p className="text-gray-500 text-sm">via {method.label}</p>
          </div>

          <div className="w-full mt-8 bg-gray-50 rounded-2xl p-4 animate-fade-slide-up space-y-3 box-border">
            {[
              { label: 'Transaction ID', value: txId },
              { label: 'Payment Method', value: method.label },
              { label: 'New Balance', value: fmt(user.balance) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-gray-900 text-sm font-semibold truncate max-w-[60%] text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-8 flex flex-col gap-3 w-full max-w-full box-border">
          <button onClick={() => app.navigate('transaction-details', { transactionId: txId })} className="w-full border-2 border-blue-600 text-blue-600 font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform">
            View Receipt
          </button>
          <button onClick={() => app.navigateRoot('home')} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-200 text-sm active:scale-95 transition-transform">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-slate-50 overflow-x-hidden box-border">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 min-h-[56px] w-full max-w-full flex-shrink-0 box-border">
        <BackBtn onClick={step === 'amount' ? undefined : () => { if (step === 'method') setStep('amount'); else if (step === 'confirm') setStep('method'); else if (step === 'pin') setStep('confirm'); }} />
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Add Money</h1>
      </div>

      {step === 'amount' && (
        <div className="flex-1 flex flex-col justify-center overflow-y-auto px-4 py-6 w-full max-w-full box-border">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4 w-full max-w-full box-border">
            <h2 className="text-gray-500 text-sm mb-3 font-medium">How much to add?</h2>
            <div className="flex items-center border-2 border-green-500 bg-green-50 rounded-2xl px-4 py-2.5 mb-2 w-full min-w-0 h-12 box-border">
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
            <p className="text-gray-400 text-xs">Current balance: {fmt(user.balance)}</p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-6 w-full max-w-full box-border">
            {PRESETS.map(v => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`py-3 px-1 min-w-0 w-full rounded-2xl text-xs sm:text-sm font-bold border-2 transition-colors truncate text-center box-border ${
                  amountNum === v ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                ₹{v}
              </button>
            ))}
          </div>

          <button
            onClick={() => amountNum > 0 && setStep('method')}
            disabled={!amountNum || amountNum <= 0}
            className="w-full max-w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-transform disabled:opacity-50 text-sm flex items-center justify-center box-border"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'method' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-full box-border">
          <p className="text-gray-500 text-sm mb-4">Select payment source</p>
          <div className="space-y-3 mb-6 w-full max-w-full">
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m)}
                className={`w-full max-w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-95 box-border ${method.id === m.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <span className="text-2xl flex-shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`font-semibold text-sm truncate ${method.id === m.id ? 'text-blue-700' : 'text-gray-900'}`}>{m.label}</p>
                  <p className="text-gray-400 text-xs truncate">{m.sub}</p>
                </div>
                {method.id === m.id && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setStep('confirm')} className="w-full max-w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform text-sm flex items-center justify-center box-border">
            Continue
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-full box-border">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-6 w-full max-w-full box-border">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-center">
              <p className="text-green-100 text-sm mb-1">Adding to wallet</p>
              <p className="text-white text-4xl font-black">{fmt(amountNum)}</p>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Payment Method', value: method.label },
                { label: 'Current Balance', value: fmt(user.balance) },
                { label: 'After Adding', value: fmt(user.balance + amountNum) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-gray-900 text-sm font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setStep('pin')} className="w-full max-w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-transform text-sm flex items-center justify-center box-border">
            Confirm & Add
          </button>
        </div>
      )}

      {step === 'pin' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10 w-full max-w-full box-border">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-900 font-bold text-lg mb-1 text-center">Enter PayVerse PIN</p>
          <p className="text-gray-500 text-sm mb-8 text-center">Confirm adding <strong>{fmt(amountNum)}</strong> to your wallet</p>
          <PINInput onComplete={handlePIN} error={pinError} onReset={() => setPinError('')} />
        </div>
      )}
    </div>
  );
}
