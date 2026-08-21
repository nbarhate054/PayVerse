import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { User } from '../store';
import { initials, avatarColor } from '../utils';
import logoSvg from '../assets/logo.svg';

interface MyQRModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function MyQRModal({ user, isOpen, onClose }: MyQRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const payverseId = user.payverseId || user.id;
  const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
  const qrPayload = JSON.stringify({
    payverseId,
    phone: cleanPhone,
    name: user.name
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(payverseId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scale-in">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white transition-all"
            aria-label="Close modal"
          >
            ✕
          </button>
          <img src={logoSvg} alt="PayVerse" className="h-7 w-auto mx-auto mb-3 filter brightness-0 invert" />
          <h2 className="text-xl font-black">My PayVerse QR</h2>
          <p className="text-blue-100 text-xs mt-0.5">Scan to pay directly into this wallet</p>
        </div>

        {/* User Info & QR Code Card */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center shadow-md mb-3`}>
            <span className="text-white font-black text-xl">{initials(user.name)}</span>
          </div>

          <h3 className="font-extrabold text-gray-900 text-lg">{user.name}</h3>
          <p className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mt-1 mb-5">
            {payverseId}
          </p>

          {/* Dynamic QR Code Container */}
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-inner mb-4 flex items-center justify-center">
            <QRCodeSVG
              value={qrPayload}
              size={190}
              level="H"
              includeMargin={false}
              fgColor="#1e293b"
              bgColor="#ffffff"
            />
          </div>

          <p className="text-gray-400 text-xs font-medium">
            Mobile: <strong className="text-gray-700">+91 {user.phone}</strong>
          </p>

          {/* Action Buttons */}
          <div className="w-full mt-6 flex flex-col gap-2.5">
            <button
              onClick={handleCopy}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-4 rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <span className="text-green-600 font-extrabold">✓ Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <span>📋 Copy PayVerse ID</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
