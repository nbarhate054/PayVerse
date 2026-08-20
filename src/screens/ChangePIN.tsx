import { useState } from 'react';
import { useApp } from '../context';

type Step = 'old' | 'new' | 'confirm' | 'success';

export default function ChangePINScreen() {
  const app = useApp();
  const [step, setStep] = useState<Step>('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const user = app.getCurrentUser()!;

  const handleOld = () => {
    if (oldPin.length !== 4 || !/^\d{4}$/.test(oldPin)) {
      setError('PIN must contain exactly 4 digits');
      return;
    }
    if (user.pin !== oldPin) {
      setError('Old PIN must be correct');
      return;
    }
    setError('');
    setStep('new');
  };

  const handleNew = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('New PIN must contain exactly 4 digits');
      return;
    }
    if (newPin === oldPin) {
      setError('New PIN should not equal old PIN');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (confirmPin.length !== 4 || !/^\d{4}$/.test(confirmPin)) {
      setError('Confirmation PIN must contain exactly 4 digits');
      return;
    }
    if (confirmPin !== newPin) {
      setError('Confirmation must match new PIN');
      return;
    }
    const result = app.changePin(oldPin, newPin);
    if (result.success) {
      setStep('success');
    } else {
      setError(result.error ?? 'Failed to change PIN');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="animate-scale-in mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}>
                <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <p className="text-gray-900 font-bold text-xl mb-2">PIN Changed Successfully!</p>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Your PayVerse payment PIN has been updated. All future demo money transactions will now require your new PIN.
          </p>
          <button
            onClick={() => app.goBack()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 text-sm active:scale-95 transition-transform"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  const steps = { old: 1, new: 2, confirm: 3, success: 4 };
  const titles = { old: 'Enter Old PIN', new: 'Set New PIN', confirm: 'Confirm New PIN' };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={app.goBack} className="p-2 rounded-xl hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Change Payment PIN</h1>
        <div className="flex gap-1.5">
          {[1, 2, 3].map(n => (
            <div key={n} className={`w-2.5 h-2.5 rounded-full transition-all ${steps[step] >= n ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-900 font-bold text-lg mb-1">{titles[step]}</p>
        <p className="text-gray-500 text-xs mb-8 text-center">
          {step === 'old' && 'Enter your current 4-digit PayVerse PIN'}
          {step === 'new' && 'Choose a new 4-digit PIN (must differ from old PIN)'}
          {step === 'confirm' && 'Re-enter your new 4-digit PIN to confirm'}
        </p>

        {/* PIN dots display */}
        <div className="flex gap-3 mb-6">
          {[0, 1, 2, 3].map(i => {
            const val = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
            return (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                  error
                    ? 'border-red-400 bg-red-50'
                    : val.length > i
                    ? 'border-blue-600 bg-blue-50 scale-105'
                    : val.length === i
                    ? 'border-blue-400 bg-white shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {val.length > i && <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-400' : 'bg-blue-600'}`} />}
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-500 text-xs font-semibold mb-6 text-center">{error}</p>}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => {
            if (n === '') return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => {
                  const setter = step === 'old' ? setOldPin : step === 'new' ? setNewPin : setConfirmPin;
                  const val = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
                  if (val.length < 4) setter(val + String(n));
                  setError('');
                }}
                className="aspect-square bg-white rounded-2xl border border-gray-200 text-gray-900 font-bold text-xl active:bg-gray-100 active:scale-95 transition-all shadow-sm"
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => {
              const setter = step === 'old' ? setOldPin : step === 'new' ? setNewPin : setConfirmPin;
              const val = step === 'old' ? oldPin : step === 'new' ? newPin : confirmPin;
              setter(val.slice(0, -1));
              setError('');
            }}
            className="aspect-square bg-white rounded-2xl border border-gray-200 flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        <button
          onClick={step === 'old' ? handleOld : step === 'new' ? handleNew : handleConfirm}
          className="w-full max-w-[280px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 text-sm active:scale-95 transition-transform"
        >
          {step === 'confirm' ? 'Change PIN' : 'Continue'}
        </button>

        {step === 'old' && (
          <p className="text-gray-400 text-xs mt-4">
            Current PIN: <strong>{user.pin}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
