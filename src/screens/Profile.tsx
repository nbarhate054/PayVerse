import { useState } from 'react';
import { useApp } from '../context';
import { initials, avatarColor } from '../utils';
import MyQRModal from '../components/MyQRModal';
import {
  IconUsers, IconLock, IconBell, IconShield, IconHelpCircle,
  IconInfo, IconRefresh, IconLogOut, IconChevronRight, IconArrowLeft
} from '../components/Icons';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  action?: () => void;
  chevron?: boolean;
  danger?: boolean;
  badge?: string;
}

export default function ProfileScreen() {
  const app = useApp();
  const user = app.getCurrentUser();
  const [showReset, setShowReset] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [activeModal, setActiveModal] = useState<'privacy' | 'security' | 'help' | 'about' | 'parent' | null>(null);

  if (!user) return null;

  const handleBack = () => {
    app.navigateRoot('home');
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Parent & Safety',
      items: [
        { icon: <IconUsers size={20} className="text-blue-600" />, label: 'Parent Controls', sub: 'Monthly limit & guardian alerts', action: () => setActiveModal('parent'), chevron: true, badge: 'ACTIVE' },
      ],
    },
    {
      title: 'Wallet & QR',
      items: [
        { icon: <span className="text-base">📱</span>, label: 'My PayVerse QR', sub: 'Display & share your personal QR code', action: () => setShowMyQR(true), chevron: true, badge: 'QR' },
        { icon: <IconLock size={20} className="text-blue-600" />, label: 'PayVerse PIN', sub: 'Change your 4-digit PIN', action: () => app.navigate('change-pin'), chevron: true },
        { icon: <IconBell size={20} className="text-blue-600" />, label: 'Notifications', sub: 'Manage transaction alerts', action: () => app.navigate('notifications'), chevron: true },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: <IconShield size={20} className="text-blue-600" />, label: 'Privacy Settings', sub: 'Data & privacy preferences', action: () => setActiveModal('privacy'), chevron: true },
        { icon: <IconShield size={20} className="text-indigo-600" />, label: 'Security & Lock', sub: 'Account security & PIN protection', action: () => setActiveModal('security'), chevron: true },
        { icon: <IconHelpCircle size={20} className="text-blue-600" />, label: 'Help & Support', sub: 'FAQs & demo guides', action: () => setActiveModal('help'), chevron: true },
        { icon: <IconInfo size={20} className="text-slate-600" />, label: 'About PayVerse', sub: 'Version 1.0.0 • Teen Mode', action: () => setActiveModal('about'), chevron: true },
      ],
    },
    {
      title: '',
      items: [
        { icon: <IconLogOut size={20} className="text-red-500" />, label: 'Logout', action: () => setShowLogout(true), danger: true },
      ],
    },
  ];

  const modalContent = {
    parent: {
      title: 'Parent Controls & Safety',
      text: `Connected Account: ${user?.name || 'User'}\nMobile Number: +91 ${user?.phone || ''}\n\n✓ Live MongoDB Atlas Balance Tracking\n✓ Real-time OTP & PIN authentication active\n✓ Restricted merchant protection active`,
    },
    privacy: {
      title: 'Data & Privacy Settings',
      text: 'PayVerse stores your authentication tokens securely and connects to MongoDB Atlas for real-time transactions. No personal data is shared with external third-party ad networks.',
    },
    security: {
      title: 'Account Security',
      text: 'Enhanced security enabled. All transfers require your 4-digit PayVerse PIN. 3 incorrect PIN attempts trigger an automatic 30-second security lock.',
    },
    help: {
      title: 'Help & Support',
      text: `Account Details:\n• Name: ${user?.name || 'N/A'}\n• PayVerse ID: ${user?.id || 'N/A'}\n• Phone: +91 ${user?.phone || 'N/A'}\n\nSupport Email: support@payverse.in`,
    },
    about: {
      title: 'About PayVerse',
      text: 'PayVerse v1.0.0 — Full-Stack Fintech Platform.\nLive MongoDB Atlas DB integration, OTP simulation, fast P2P transfers & instant wallet management.',
    },
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-5 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => app.navigateRoot('home')}
            className="p-2.5 -ml-2 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 text-white transition-all flex items-center justify-center cursor-pointer relative z-20 pointer-events-auto shadow-sm"
            aria-label="Back to Home"
          >
            <IconArrowLeft size={20} className="text-white stroke-[2.5]" />
          </button>
          <h1 className="text-white font-black text-xl">My Profile</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center shadow-lg border-2 border-white/20`}>
            <span className="text-white font-black text-xl">{initials(user.name)}</span>
          </div>
          <div>
            <p className="text-white font-extrabold text-xl">{user.name}</p>
            <p className="text-blue-200 text-xs font-mono">{user.id}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-xs font-bold">Verified Account Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phone & Info */}
      <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-gray-900 text-xs font-bold">+91 {user.phone}</p>
          {user.email && <p className="text-gray-400 text-[11px] font-mono">{user.email}</p>}
        </div>
        <div className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">VERIFIED</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {sections.map((section, si) => (
          section.items.length > 0 && (
            <div key={si}>
              {section.title && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{section.title}</p>}
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                {section.items.map((item, ii) => (
                  <button
                    key={item.label}
                    onClick={item.action ?? (() => {})}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors ${ii !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-xs font-bold ${item.danger ? 'text-red-500' : 'text-gray-900'}`}>{item.label}</p>
                      {item.sub && <p className="text-gray-400 text-[11px] mt-0.5">{item.sub}</p>}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">{item.badge}</span>
                    )}
                    {item.chevron && (
                      <IconChevronRight size={16} className="text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Info dialog modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-gray-900 font-bold text-lg text-center mb-2">{modalContent[activeModal].title}</h3>
            <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line text-center mb-6">{modalContent[activeModal].text}</p>
            <button onClick={() => setActiveModal(null)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm">
              Close
            </button>
          </div>
        </div>
      )}



      {/* Logout confirm dialog */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <IconLogOut size={24} />
            </div>
            <h3 className="text-gray-900 font-bold text-lg text-center mb-2">Logout?</h3>
            <p className="text-gray-500 text-xs text-center mb-6">Your demo data will be preserved. You can log back in anytime.</p>
            <button onClick={() => { app.logout(); setShowLogout(false); }} className="w-full bg-red-600 text-white font-bold py-3.5 rounded-2xl mb-2.5 text-sm active:scale-95 transition-transform">
              Logout
            </button>
            <button onClick={() => setShowLogout(false)} className="w-full py-3 text-gray-500 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {/* My QR Modal */}
      <MyQRModal
        user={user}
        isOpen={showMyQR}
        onClose={() => setShowMyQR(false)}
      />
    </div>
  );
}
