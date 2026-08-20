import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context';
import type { User } from '../store';
import { fmt, initials, avatarColor } from '../utils';
import PINInput from '../components/PINInput';

type Step = 'scan' | 'amount' | 'confirm' | 'pin' | 'processing' | 'success';
type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

export default function QRPayScreen() {
  const app = useApp();
  const user = app.getCurrentUser()!;
  const [step, setStep] = useState<Step>('scan');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pinError, setPinError] = useState('');
  const [txId, setTxId] = useState('');
  const processingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const selectRecipientAndProceed = (u: User) => {
    stopCamera();
    setRecipient(u);
    setStep('amount');
  };

  const handleScannedValue = useCallback((val: string) => {
    let cleanId = val.trim().toLowerCase();
    if (cleanId.includes('payverse=')) {
      cleanId = cleanId.split('payverse=')[1];
    }
    if (!cleanId.includes('@')) {
      cleanId = `${cleanId}@payverse`;
    }
    const targetUser = app.getUserById(cleanId);
    if (targetUser && targetUser.id !== user.id) {
      selectRecipientAndProceed(targetUser);
    }
  }, [app, user.id]);

  const startCamera = async () => {
    setCameraState('requesting');
    setCameraErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported on this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraState('active');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      }, 100);

      // Start BarcodeDetector or scanner loop if supported
      if ('BarcodeDetector' in window) {
        try {
          // @ts-expect-error BarcodeDetector API
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const scanLoop = async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue || '';
                  handleScannedValue(rawVal);
                  return;
                }
              } catch {
                // Ignore detection error in loop
              }
            }
            if (streamRef.current) {
              animFrameRef.current = requestAnimationFrame(scanLoop);
            }
          };
          scanLoop();
        } catch (e) {
          console.warn('BarcodeDetector init error:', e);
        }
      }
    } catch (err: unknown) {
      stopCamera();
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraErrorMsg('Camera access is required to scan QR codes. Please allow camera permission from your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setCameraErrorMsg('No camera device found on your device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraState('error');
        setCameraErrorMsg('Camera is currently in use by another application.');
      } else {
        setCameraState('error');
        setCameraErrorMsg(error.message || 'Unable to access camera.');
      }
    }
  };

  const handleManualEntry = () => {
    let id = manualId.trim().toLowerCase();
    if (!id) {
      setManualError('Please enter a PayVerse ID');
      return;
    }
    if (!id.includes('@')) {
      id = `${id}@payverse`;
    }
    if (id === user.id) {
      setManualError("You cannot pay yourself");
      return;
    }
    const u = app.getUserById(id);
    if (!u) {
      setManualError('PayVerse ID not found.');
      return;
    }
    selectRecipientAndProceed(u);
    setManualError('');
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
        note: note || 'QR Payment',
        pin,
        paymentMethod: 'PayVerse QR',
      });
      processingRef.current = false;
      if (result.success) {
        setTxId(result.transactionId!);
        setStep('success');
      } else {
        setPinError(result.error ?? 'PIN Verification Failed');
        setStep('pin');
      }
    } catch (err: any) {
      processingRef.current = false;
      setPinError(err.message || 'Payment Failed');
      setStep('pin');
    }
  };

  const amountNum = parseFloat(amount) || 0;

  const BackBtn = ({ onClick }: { onClick?: () => void }) => (
    <button onClick={onClick ?? (() => { stopCamera(); app.goBack(); })} className="p-2 rounded-xl hover:bg-gray-100 flex-shrink-0">
      <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (step === 'processing') {
    return (
      <div className="flex flex-col h-full w-full max-w-full items-center justify-center bg-white px-6 text-center box-border">
        <div className="w-20 h-20 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin-ring mb-6 flex-shrink-0" />
        <p className="text-gray-900 font-bold text-xl mb-1">Processing Simulated Payment...</p>
        <p className="text-gray-400 text-xs">Executing local PayVerse transaction engine</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col h-full w-full max-w-full bg-white box-border">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center w-full box-border">
          <div className="animate-scale-in mb-6 flex-shrink-0">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}>
                <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full mb-3">⚡ DEMO SIMULATION SUCCESS</span>
          <p className="text-gray-500 text-sm font-medium mb-1">Payment Successful</p>
          <p className="text-gray-900 text-4xl font-black mb-1">{fmt(amountNum)}</p>
          <p className="text-gray-500 text-sm mb-6">Sent to <strong>{recipient?.name}</strong> ({recipient?.id})</p>
          
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-left text-xs mb-4 box-border">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Transaction ID</span>
              <span className="text-gray-900 font-mono font-bold">{txId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Payment Engine</span>
              <span className="text-gray-900 font-semibold">PayVerse Wallet (Local)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Updated Wallet Balance</span>
              <span className="text-green-600 font-bold">{fmt(user.balance)}</span>
            </div>
          </div>
          <p className="text-gray-400 text-[11px]">Recorded to Transaction History & persisted locally.</p>
        </div>
        
        <div className="px-5 pb-8 flex flex-col gap-3 w-full max-w-full box-border">
          <button onClick={() => app.navigate('transaction-details', { transactionId: txId })} className="w-full border-2 border-orange-500 text-orange-600 font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform">
            View Receipt
          </button>
          <button onClick={() => app.navigateRoot('home')} className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 text-sm active:scale-95 transition-transform">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-slate-50 overflow-hidden box-border">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between min-h-[56px] w-full max-w-full flex-shrink-0 box-border">
        <div className="flex items-center gap-3">
          <BackBtn onClick={step === 'scan' ? undefined : () => {
            if (step === 'amount') setStep('scan');
            else if (step === 'confirm') setStep('amount');
            else if (step === 'pin') setStep('confirm');
          }} />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Scan & Pay</h1>
            <p className="text-amber-600 text-[10px] font-semibold">⚡ Simulated Demo Mode • Camera Scanner</p>
          </div>
        </div>
        {cameraState === 'active' && (
          <button
            onClick={stopCamera}
            className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl transition-colors"
          >
            Close Camera
          </button>
        )}
      </div>

      {step === 'scan' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border">
          {/* Camera Scanner Viewfinder Container */}
          <div className="bg-slate-900 rounded-3xl p-4 mb-5 relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[260px] shadow-lg">
            {cameraState === 'active' ? (
              <div className="relative w-full h-64 rounded-2xl overflow-hidden flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Scanner Frame Overlay */}
                <div className="relative z-10 w-48 h-48 pointer-events-none">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

                  {/* Scanning Laser Line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0 top-1/2 shadow-[0_0_8px_#fbbf24] animate-pulse-soft" />
                </div>

                <div className="absolute bottom-3 left-0 right-0 z-10 text-center px-4">
                  <p className="text-white font-bold text-xs shadow-black drop-shadow">Scan QR Code</p>
                  <p className="text-amber-300/90 text-[10px]">Align the QR code within the frame</p>
                </div>
              </div>
            ) : cameraState === 'requesting' ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-amber-400 animate-spin-ring mb-4" />
                <p className="text-white text-sm font-bold">Requesting Camera Permission...</p>
                <p className="text-slate-400 text-xs mt-1">Please respond to your browser prompt</p>
              </div>
            ) : cameraState === 'denied' || cameraState === 'error' ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm mb-1">Camera Permission Required</p>
                <p className="text-slate-300 text-xs mb-4 max-w-[260px] leading-relaxed">{cameraErrorMsg}</p>
                <button
                  onClick={startCamera}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-md"
                >
                  Try Again
                </button>
              </div>
            ) : (
              /* Idle state: Prompts user to start camera */
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm mb-1">Ready to Scan QR Code</p>
                <p className="text-slate-400 text-xs mb-5">Click below to open your camera scanner</p>
                <button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Open Camera Scanner
                </button>
              </div>
            )}
          </div>

          {/* Enter PayVerse ID manually */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Enter PayVerse ID Manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. aarav@payverse"
                value={manualId}
                onChange={e => { setManualId(e.target.value); setManualError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 text-gray-900"
              />
              <button
                onClick={handleManualEntry}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm active:scale-95 transition-transform shadow-md"
              >
                Proceed
              </button>
            </div>
            {manualError && <p className="text-red-500 text-xs mt-2 font-medium">{manualError}</p>}
          </div>
        </div>
      )}

      {step === 'amount' && recipient && (
        <div className="flex-1 overflow-y-auto px-4 py-5 w-full max-w-full box-border">
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mb-5 border border-gray-100 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(recipient.name)} flex items-center justify-center`}>
              <span className="text-white font-bold">{initials(recipient.name)}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{recipient.name}</p>
              <p className="text-gray-400 text-xs">{recipient.id}</p>
            </div>
            <div className="bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
              <span className="text-amber-700 text-xs font-bold">QR Verified ✓</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
            <p className="text-gray-500 text-xs font-semibold mb-3">Enter Payment Amount</p>
            <div className="flex items-center border-2 border-orange-400 bg-orange-50/50 rounded-2xl px-4 py-3 mb-2">
              <span className="text-2xl font-black text-gray-700 mr-2">₹</span>
              <input type="tel" inputMode="numeric" placeholder="0" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} autoFocus className="flex-1 text-2xl font-black text-gray-900 bg-transparent focus:outline-none placeholder-gray-300" />
            </div>
            {amountNum > user.balance ? (
              <p className="text-red-500 text-xs font-medium mt-1">Insufficient balance. Available: {fmt(user.balance)}</p>
            ) : (
              <p className="text-gray-400 text-xs mt-1">Available Wallet Balance: <strong>{fmt(user.balance)}</strong></p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6">
            <p className="text-gray-400 text-xs mb-1 font-medium">Add Note (Optional)</p>
            <input type="text" placeholder="e.g. Lunch split, Coffee" value={note} onChange={e => setNote(e.target.value)} className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none" maxLength={100} />
          </div>

          <button
            onClick={() => amountNum > 0 && amountNum <= user.balance && setStep('confirm')}
            disabled={!amountNum || amountNum > user.balance}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-transform disabled:opacity-50 text-sm"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'confirm' && recipient && (
        <div className="flex-1 overflow-y-auto px-4 py-5 w-full max-w-full box-border">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-5">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-center text-white">
              <p className="text-orange-100 text-xs font-semibold mb-1">Confirm QR Payment</p>
              <p className="text-4xl font-black">{fmt(amountNum)}</p>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-50">
                <span className="text-gray-400">Recipient</span>
                <span className="text-gray-900 font-bold">{recipient.name} ({recipient.id})</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-50">
                <span className="text-gray-400">Payment Engine</span>
                <span className="text-gray-900 font-medium">PayVerse Wallet (Local Engine)</span>
              </div>
              {note && (
                <div className="flex justify-between pb-2 border-b border-gray-50">
                  <span className="text-gray-400">Note</span>
                  <span className="text-gray-900 font-medium">{note}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Balance After Payment</span>
                <span className="text-gray-900 font-bold">{fmt(user.balance - amountNum)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('pin')}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-transform text-sm"
          >
            Pay {fmt(amountNum)}
          </button>
        </div>
      )}

      {step === 'pin' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10 w-full max-w-full box-border">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-900 font-bold text-lg mb-1">Enter PayVerse PIN</p>
          <p className="text-gray-500 text-xs mb-8 text-center">Confirm payment of <strong>{fmt(amountNum)}</strong> to <strong>{recipient?.name}</strong></p>
          <PINInput onComplete={handlePIN} error={pinError} onReset={() => setPinError('')} />
        </div>
      )}
    </div>
  );
}
