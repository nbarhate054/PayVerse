import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import type { User } from '../store';
import logoSvg from '../assets/logo.svg';

interface ScanPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (recipient: User) => void;
}

export default function ScanPayModal({ isOpen, onClose, onSuccess }: ScanPayModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrRegionId = 'payverse-qr-scanner-region';

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;

    if (isOpen) {
      setError(null);
      setManualInput('');

      // Initialize scanner after element is rendered
      const timeout = setTimeout(() => {
        const regionEl = document.getElementById(qrRegionId);
        if (regionEl) {
          try {
            html5Qrcode = new Html5Qrcode(qrRegionId);
            scannerRef.current = html5Qrcode;

            const config = { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

            html5Qrcode.start(
              { facingMode: 'environment' },
              config,
              async (decodedText) => {
                // Successful QR Code scan
                if (html5Qrcode && html5Qrcode.isScanning) {
                  try {
                    await html5Qrcode.stop();
                  } catch {}
                }
                setCameraActive(false);
                handleQrPayload(decodedText);
              },
              () => {
                // Scan attempt error (silent frame scan pass)
              }
            ).then(() => {
              setCameraActive(true);
            }).catch((err) => {
              console.warn('Camera access warning / not available:', err);
              setCameraActive(false);
            });
          } catch (e) {
            console.warn('HTML5 QR Code init error:', e);
            setCameraActive(false);
          }
        }
      }, 300);

      return () => {
        clearTimeout(timeout);
        if (html5Qrcode && html5Qrcode.isScanning) {
          html5Qrcode.stop().catch(() => {}).finally(() => {
            html5Qrcode?.clear();
          });
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQrPayload = async (rawPayload: string) => {
    if (!rawPayload || !rawPayload.trim()) return;

    let targetQuery = rawPayload.trim();
    let parsedName = '';

    // Check if JSON payload
    try {
      if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
        const parsed = JSON.parse(rawPayload);
        targetQuery = parsed.payverseId || parsed.phone || parsed.email || targetQuery;
        parsedName = parsed.name || '';
      }
    } catch {}

    // Check if PayVerse URI format
    if (targetQuery.includes('payverse=')) {
      targetQuery = targetQuery.split('payverse=')[1];
    } else if (targetQuery.startsWith('payverse://')) {
      targetQuery = targetQuery.replace('payverse://', '');
    }

    setIsSearching(true);
    setError(null);

    try {
      const res = await api.findUser(targetQuery);
      setIsSearching(false);

      if (res && res.success && res.user) {
        const u = res.user;
        const recipientUser: User = {
          id: u.payverseId || u._id || u.phone,
          name: u.name || parsedName || 'PayVerse User',
          phone: u.phone,
          payverseId: u.payverseId,
          balance: 0,
          pin: '1234',
          isOnboarded: true,
          onboardingStatus: 'completed',
        };
        onClose();
        onSuccess(recipientUser);
      } else if (parsedName || targetQuery) {
        // Fallback recipient structure if user network lookup yields fallback
        const recipientUser: User = {
          id: targetQuery,
          name: parsedName || 'PayVerse User',
          phone: targetQuery,
          balance: 0,
          pin: '1234',
          isOnboarded: true,
          onboardingStatus: 'completed',
        };
        onClose();
        onSuccess(recipientUser);
      } else {
        setError(res?.message || 'No PayVerse user found matching scanned QR code.');
      }
    } catch (err: any) {
      setIsSearching(false);
      if (parsedName || targetQuery) {
        const recipientUser: User = {
          id: targetQuery,
          name: parsedName || 'PayVerse User',
          phone: targetQuery,
          balance: 0,
          pin: '1234',
          isOnboarded: true,
          onboardingStatus: 'completed',
        };
        onClose();
        onSuccess(recipientUser);
      } else {
        setError('No PayVerse user found matching scanned QR code.');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setError(null);

    try {
      const scanner = scannerRef.current || new Html5Qrcode(qrRegionId);
      const decodedText = await scanner.scanFile(file, true);
      setIsSearching(false);
      handleQrPayload(decodedText);
    } catch (err) {
      setIsSearching(false);
      setError('Unable to detect QR code from uploaded image. Please select another image.');
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError('Please enter a valid mobile number or PayVerse ID');
      return;
    }
    handleQrPayload(manualInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scale-in">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoSvg} alt="PayVerse" className="h-6 w-auto filter brightness-0 invert" />
            <h2 className="text-lg font-black">Scan & Pay</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {/* QR Camera Reader Region */}
          <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-slate-200 shadow-inner flex flex-col items-center justify-center min-h-[240px] mb-3">
            <div id={qrRegionId} className="w-full h-full min-h-[220px]" />

            {!cameraActive && !isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-4 text-white">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl mb-3 animate-pulse">
                  📷
                </div>
                <p className="font-bold text-sm">Align QR Code within frame</p>
                <p className="text-slate-400 text-xs mt-1">Or upload a QR screenshot below</p>
              </div>
            )}

            {isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-4 text-white">
                <div className="w-10 h-10 rounded-full border-4 border-blue-400 border-t-transparent animate-spin mb-3" />
                <p className="font-bold text-sm">Validating recipient...</p>
              </div>
            )}
          </div>

          {/* Upload Image Fallback */}
          <div className="w-full mb-4">
            <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200/80 active:scale-95">
              <span>🖼️ Upload QR Image from Gallery</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-xs font-medium text-center animate-fade-slide-up">
              {error}
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="w-full space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter PayVerse ID or mobile number"
                value={manualInput}
                onChange={e => { setManualInput(e.target.value); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 bg-slate-50 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim() || isSearching}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
            >
              Proceed to Pay →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
