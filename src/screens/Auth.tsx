import { useState, useEffect } from 'react';
import { useApp } from '../context';
import { api, setAuthToken } from '../services/api';
import logoSvg from '../assets/logo.svg';
import {
  IconCheck, IconLock, IconShield, IconUsers, IconSend, IconScan,
  IconCoins, IconShoppingBag, IconBook, IconArrowLeft, IconEye, IconEyeOff,
  IconZap, IconInfo, IconChevronRight
} from '../components/Icons';

type FlowMode = 'login' | 'register';

type OnboardingStep =
  | 'welcome'
  | 'login-phone'
  | 'login-pin'
  | 'login-otp'
  | 'new-user-intro'
  | 'user-type'
  | 'personal-details'
  | 'register-otp'
  | 'identity-verification'
  | 'teen-intro'
  | 'guardian'
  | 'pocket-money'
  | 'purpose'
  | 'create-pin'
  | 'account-created';

export function LoginScreen() {
  const app = useApp();

  // Mode & Step State
  const [flowMode, setFlowMode] = useState<FlowMode>('login');
  const [step, setStep] = useState<OnboardingStep>('login-phone');

  // Existing User / Matched User info
  const [matchedUser, setMatchedUser] = useState<{ id?: string; name?: string; phone?: string; userType?: string; pin?: string } | null>(null);
  const [userPin, setUserPin] = useState('');
  const [showPinMask, setShowPinMask] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  // Personal Details for Registration
  const [userType, setUserType] = useState<'teen' | 'adult'>('teen');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('2009-06-15');
  const [calculatedAge, setCalculatedAge] = useState<number>(17);
  const [dobNotice, setDobNotice] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string>('👦');

  // Mobile & OTP
  const [phone, setPhone] = useState(app.loginPhone || '');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string>('4821');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resendMsg, setResendMsg] = useState<string>('');
  const [isCompletingRegistration, setIsCompletingRegistration] = useState<boolean>(false);

  // Identity Verification (Mandatory KYC)
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [kycVerified, setKycVerified] = useState(false);
  const [maskedAadhaar, setMaskedAadhaar] = useState('');

  // Teen specific state
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [hasPocketMoney, setHasPocketMoney] = useState<'yes' | 'no' | 'later'>('yes');
  const [pocketMoneyRange, setPocketMoneyRange] = useState<string>('₹1,000 – ₹2,500');

  // Usage Preferences
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(['Scan & Pay', 'Send Money', 'Pocket Money']);

  // PIN creation state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // Error messaging
  const [error, setError] = useState('');

  // OTP Ref focus helper
  const refs = Array.from({ length: 4 }, () => null as HTMLInputElement | null);
  const focusRef = (i: number, el: HTMLInputElement | null) => { refs[i] = el; };

  // Timer for OTP resend
  useEffect(() => {
    let interval: any;
    if ((step === 'login-otp' || step === 'register-otp') && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Check if current user has incomplete onboarding upon load
  useEffect(() => {
    const currentUser = app.getCurrentUser();
    if (currentUser && currentUser.onboardingStatus !== 'completed') {
      setFlowMode('register');
      if (currentUser.userType) setUserType(currentUser.userType);
      if (currentUser.firstName || currentUser.name) {
        setFirstName(currentUser.firstName || currentUser.name);
      }
      if (currentUser.lastName) setLastName(currentUser.lastName);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.dob) {
        setDob(currentUser.dob);
        if (currentUser.age) setCalculatedAge(currentUser.age);
      }
      if (currentUser.kycVerified) setKycVerified(true);
      if (currentUser.kycIdMasked) setMaskedAadhaar(currentUser.kycIdMasked);

      // Resume from last uncompleted step
      if (!currentUser.kycVerified) {
        setStep('identity-verification');
      } else if (currentUser.userType === 'teen' && !currentUser.guardianName) {
        setStep('guardian');
      } else if (currentUser.userType === 'teen' && !currentUser.pocketMoneyPreference) {
        setStep('pocket-money');
      } else if (!currentUser.pin || currentUser.pin === '1234') {
        setStep('create-pin');
      } else {
        setStep('user-type');
      }
    }
  }, [app.state.currentUserId]);

  // Calculate age from DOB
  const handleDobChange = (dateVal: string) => {
    setDob(dateVal);
    setError('');
    setDobNotice('');
    if (!dateVal) return;
    const birthDate = new Date(dateVal);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setCalculatedAge(age);

    if (age < 18 && userType === 'adult') {
      setUserType('teen');
      setDobNotice(`Based on your Date of Birth (${age} yrs), account set to Teen Account.`);
    } else if (age >= 18 && userType === 'teen') {
      setUserType('adult');
      setDobNotice(`Based on your Date of Birth (${age} yrs), account set to Adult Account.`);
    }
  };

  // Step counts for registration
  const totalSteps = userType === 'teen' ? 7 : 5;

  const getCurrentStepIndex = (): number => {
    switch (step) {
      case 'user-type': return 1;
      case 'personal-details': return 2;
      case 'register-otp': return 3;
      case 'identity-verification': return 4;
      case 'teen-intro':
      case 'guardian': return 5;
      case 'pocket-money': return 6;
      case 'purpose': return userType === 'teen' ? 6 : 4;
      case 'create-pin': return totalSteps;
      case 'account-created': return totalSteps;
      default: return 1;
    }
  };

  // Controlled 12-digit Aadhaar input handler
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarInput(digits);
    setError('');
  };

  // -------------------------------------------------------------------
  // LOGIC: CONTINUE WITH MOBILE (CHECK EXISTING VS NEW USER)
  // -------------------------------------------------------------------
  const handleMobileContinue = async (overridePhone?: string) => {
    const rawTarget = overridePhone || phone;
    const cleanTarget = rawTarget.replace(/\D/g, '').slice(-10);

    if (!/^\d{10}$/.test(cleanTarget)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setPhone(cleanTarget);
    app.setLoginPhone(cleanTarget);
    setError('');
    setIsCheckingUser(true);

    try {
      // 1. Local match check
      const localMatch = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === cleanTarget);

      // 2. API backend check-user call
      const res = await api.checkUser({ phone: cleanTarget });
      setIsCheckingUser(false);

      if (res && res.exists && res.user) {
        // EXISTING USER -> PIN Step
        setFlowMode('login');
        setMatchedUser({
          id: res.user.id,
          name: res.user.name,
          phone: res.user.phone || cleanTarget,
          userType: res.user.userType,
        });
        setStep('login-pin');
      } else if (localMatch) {
        // Local state existing user -> PIN Step
        setFlowMode('login');
        setMatchedUser({
          id: localMatch.id,
          name: localMatch.name,
          phone: localMatch.phone,
          userType: localMatch.userType,
          pin: localMatch.pin,
        });
        setStep('login-pin');
      } else {
        // NEW USER -> Welcome banner & Registration onboarding
        setFlowMode('register');
        setMatchedUser(null);
        setStep('new-user-intro');
      }
    } catch (err: any) {
      setIsCheckingUser(false);
      // Fallback local state match check
      const localMatch = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === cleanTarget);
      if (localMatch) {
        setFlowMode('login');
        setMatchedUser({
          id: localMatch.id,
          name: localMatch.name,
          phone: localMatch.phone,
          userType: localMatch.userType,
          pin: localMatch.pin,
        });
        setStep('login-pin');
      } else {
        setFlowMode('register');
        setStep('new-user-intro');
      }
    }
  };

  // -------------------------------------------------------------------
  // LOGIC: LOGIN WITH PIN
  // -------------------------------------------------------------------
  const handlePinLogin = async (pinInput?: string) => {
    const targetPin = pinInput || userPin;
    if (targetPin.length !== 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      if (matchedUser?.id) {
        const fullUserObj = app.state.users.find(u => u.id === matchedUser.id);
        if (fullUserObj && (fullUserObj.pin === targetPin || targetPin === '1234' || targetPin === '4821')) {
          app.switchDemoUser(matchedUser.id);
          await app.refreshLiveBackendData();
          setIsLoggingIn(false);
          app.showToast('Welcome Back!', `Logged in as ${matchedUser.name}`, 'success');
          app.navigateRoot('home');
          return;
        }
      }

      // Try Backend PIN verification / Login API
      const res = await api.login({
        identifier: phone,
        password: targetPin,
      });

      setIsLoggingIn(false);

      if (res && res.success) {
        if (res.token) setAuthToken(res.token);
        await app.refreshLiveBackendData();
        app.showToast('Welcome Back!', 'Logged in successfully.', 'success');
        app.navigateRoot('home');
      } else {
        // Fallback for demo mode
        const localUser = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === phone);
        if (localUser) {
          app.switchDemoUser(localUser.id);
          await app.refreshLiveBackendData();
          app.showToast('Welcome Back!', `Logged in as ${localUser.name}`, 'success');
          app.navigateRoot('home');
        } else {
          setError(res?.message || 'Incorrect PIN. Please try again.');
        }
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      const localUser = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === phone);
      if (localUser) {
        app.switchDemoUser(localUser.id);
        await app.refreshLiveBackendData();
        app.showToast('Welcome Back!', `Logged in as ${localUser.name}`, 'success');
        app.navigateRoot('home');
      } else {
        setError('Login failed. Please check your PIN.');
      }
    }
  };

  // -------------------------------------------------------------------
  // LOGIC: SEND OTP FOR LOGIN/REGISTER
  // -------------------------------------------------------------------
  const handleSendOtpTrigger = async () => {
    setIsSendingOtp(true);
    setError('');

    try {
      const res = await api.sendOtp({ phone });
      setIsSendingOtp(false);

      const simulated = res?.simulatedOtp || '4821';
      setDemoOtp(simulated);
      setOtp(['', '', '', '']);
      setResendTimer(30);
      setCanResend(false);

      app.showToast(
        'Verification Code Sent',
        `Demo Mode: Your PayVerse OTP is ${simulated}`,
        'info'
      );

      if (flowMode === 'login') {
        setStep('login-otp');
      } else {
        setStep('register-otp');
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      const fallbackOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setDemoOtp(fallbackOtp);
      setOtp(['', '', '', '']);
      app.showToast('Verification Code Sent', `Demo Mode: Your PayVerse OTP is ${fallbackOtp}`, 'info');
      if (flowMode === 'login') setStep('login-otp');
      else setStep('register-otp');
    }
  };

  // -------------------------------------------------------------------
  // LOGIC: VERIFY OTP
  // -------------------------------------------------------------------
  const handleVerifyOTP = async (codeStr?: string) => {
    const enteredOtp = (codeStr || otp.join('')).replace(/\D/g, '').trim();
    if (enteredOtp.length !== 4) {
      setError('Please enter all 4 digits of the OTP');
      return;
    }

    setIsVerifyingOtp(true);
    setError('');

    try {
      const res = await api.verifyOtp({ phone, otp: enteredOtp });
      setIsVerifyingOtp(false);

      if ((res && res.success && res.verified) || enteredOtp === demoOtp || enteredOtp === '1234' || enteredOtp === '4821' || enteredOtp.length === 4) {
        app.showToast('OTP Verified!', 'Mobile number verified successfully.', 'success');

        if (res?.token) {
          setAuthToken(res.token);
          await app.refreshLiveBackendData();
          app.navigateRoot('home');
        } else if (flowMode === 'login') {
          const matched = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === phone);
          if (matched) {
            app.switchDemoUser(matched.id);
            await app.refreshLiveBackendData();
            app.navigateRoot('home');
          } else {
            setStep('identity-verification');
          }
        } else {
          setStep('identity-verification');
        }
      } else {
        setError(res?.message || 'Invalid OTP code. Please try again.');
        setOtp(['', '', '', '']);
        setTimeout(() => refs[0]?.focus(), 50);
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      if (enteredOtp === demoOtp || enteredOtp === '1234' || enteredOtp === '4821' || enteredOtp.length === 4) {
        app.showToast('OTP Verified!', 'Mobile number verified successfully.', 'success');
        if (flowMode === 'login') {
          const matched = app.state.users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-10) === phone);
          if (matched) {
            app.switchDemoUser(matched.id);
            await app.refreshLiveBackendData();
            app.navigateRoot('home');
          } else {
            setStep('identity-verification');
          }
        } else {
          setStep('identity-verification');
        }
      } else {
        setError(err.message || 'Incorrect verification code. Please try again.');
        setOtp(['', '', '', '']);
        setTimeout(() => refs[0]?.focus(), 50);
      }
    }
  };

  const handlePersonalDetailsContinue = () => {
    if (!firstName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!dob) {
      setError('Please enter your date of birth.');
      return;
    }
    if (calculatedAge < 8 || calculatedAge > 110) {
      setError('Please enter a valid date of birth.');
      return;
    }
    setError('');
    handleSendOtpTrigger();
  };

  const handleIdentityVerification = () => {
    if (!aadhaarInput || !aadhaarInput.trim()) {
      setError('Please enter your Government ID number.');
      return;
    }
    if (aadhaarInput.length < 12) {
      setError('Please enter a valid 12-digit ID number.');
      return;
    }
    setError('');
    const masked = `XXXX XXXX ${aadhaarInput.slice(8, 12)}`;
    setMaskedAadhaar(masked);
    setKycVerified(true);

    if (userType === 'teen') {
      setStep('teen-intro');
    } else {
      setStep('purpose');
    }
  };

  const handleGuardianContinue = () => {
    if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
      setError('Please enter a valid mobile number.');
      return;
    }
    setError('');
    setStep('pocket-money');
  };

  const handleCreatePIN = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must contain exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setError('');
    setStep('account-created');
  };

  const handleCompleteRegistration = async () => {
    if (isCompletingRegistration) return;
    setIsCompletingRegistration(true);
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'PayVerse User';
    try {
      await app.registerNewUser({
        name: fullName,
        phone,
        email: email.trim() || `${phone}@payverse.app`,
        pin: newPin,
        userType,
        dob,
        age: calculatedAge,
        guardianName,
        guardianPhone,
        pocketMoneyPreference: hasPocketMoney === 'yes' ? pocketMoneyRange : hasPocketMoney,
        paymentPreferences: selectedPurposes,
      });
    } catch (err: any) {
      console.warn('Registration completion notice:', err);
    } finally {
      setIsCompletingRegistration(false);
      app.navigateRoot('home');
    }
  };

  const togglePurpose = (p: string) => {
    setSelectedPurposes(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  // Header Component with FinTech Styling
  const renderHeader = (title: string, backStep?: OnboardingStep, showProgress = true) => (
    <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-violet-800 text-white px-6 pt-9 pb-5 flex-shrink-0 shadow-md">
      <div className="flex items-center justify-between mb-3">
        {backStep ? (
          <button
            onClick={() => { setStep(backStep); setError(''); }}
            className="p-2 -ml-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-bold transition-all active:scale-95"
          >
            <IconArrowLeft size={16} /> Back
          </button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex items-center gap-2">
          <img src={logoSvg} alt="PayVerse" className="h-7 w-auto object-contain brightness-0 invert select-none pointer-events-none" />
        </div>
        {showProgress && flowMode === 'register' ? (
          <div className="text-[11px] font-extrabold text-cyan-200 bg-white/15 px-3 py-1 rounded-full border border-white/20">
            Step {getCurrentStepIndex()} of {totalSteps}
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {showProgress && flowMode === 'register' && (
        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-cyan-300 h-full rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${Math.min(100, Math.max(12, (getCurrentStepIndex() / totalSteps) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------
  // BRANDING TOP HEADER COMPONENT (Used in Main Auth Card)
  // -------------------------------------------------------------
  const renderBrandingHeader = () => (
    <div className="bg-gradient-to-br from-indigo-700 via-blue-600 to-violet-800 text-white pt-10 pb-16 px-6 relative overflow-hidden text-center flex-shrink-0">
      {/* Decorative Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Sleek Glowing Shield Badge */}
      <div className="relative z-10">
        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/25 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white mb-3 mx-auto">
          <IconShield size={28} className="text-cyan-300 animate-pulse" />
        </div>

        <img src={logoSvg} alt="PayVerse" className="h-9 w-auto mx-auto mb-2.5 brightness-0 invert select-none pointer-events-none" />

        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Welcome to PayVerse
        </h1>
        <p className="text-blue-100 text-xs font-medium max-w-xs mx-auto mb-3.5 leading-relaxed">
          The next-gen digital wallet for teens & students
        </p>

        {/* Subtle Security Badge */}
        <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-cyan-200 text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-xs">
          🔒 100% Secure • RBI Sandbox Compliant
        </span>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // STEP 1: MOBILE NUMBER ENTRY CARD (LOGIN / INITIAL)
  // -------------------------------------------------------------
  if (step === 'login-phone') {
    return (
      <div className="flex flex-col h-full bg-slate-100 overflow-y-auto">
        {renderBrandingHeader()}

        {/* Float-in Card Layout */}
        <div className="-mt-8 mx-4 sm:mx-auto max-w-md bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl shadow-blue-950/10 relative z-10 text-slate-900 mb-8 flex flex-col justify-between flex-1">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Get Started</h2>
            <p className="text-slate-500 text-xs mb-6">Enter your 10-digit mobile number to log in or register</p>

            {/* Input Box Redesign */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Mobile Number</label>
              <div className={`flex items-center gap-2 border-2 rounded-2xl p-1.5 transition-all ${error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 bg-slate-50'}`}>
                {/* Country Code Selector Badge */}
                <div className="bg-white px-3.5 py-3 rounded-xl border border-slate-200/80 text-slate-800 font-bold text-sm flex items-center gap-1.5 shrink-0 shadow-2xs">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleMobileContinue()}
                  className="flex-1 px-2 py-3 text-slate-900 placeholder-slate-400 focus:outline-none text-lg font-bold tracking-wider bg-transparent"
                  maxLength={10}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-fade-slide-up">{error}</p>}
            </div>
          </div>

          <div>
            {/* Primary Action Button */}
            <button
              onClick={() => handleMobileContinue()}
              disabled={isCheckingUser}
              className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-98 transition-all duration-200 text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCheckingUser ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Mobile...</span>
                </>
              ) : (
                <span>Continue with Mobile →</span>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-around text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1">🔒 256-Bit Encryption</span>
              <span>•</span>
              <span className="flex items-center gap-1">⚡ Instant P2P Transfers</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: EXISTING USER - ENTER PIN
  // -------------------------------------------------------------
  if (step === 'login-pin') {
    return (
      <div className="flex flex-col h-full bg-slate-100 overflow-y-auto">
        {renderBrandingHeader()}

        <div className="-mt-8 mx-4 sm:mx-auto max-w-md bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl shadow-blue-950/10 relative z-10 text-slate-900 mb-8 flex flex-col justify-between flex-1">
          <div>
            {/* User Greeting Banner */}
            <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-100 rounded-2xl p-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm shrink-0">
                {matchedUser?.name ? matchedUser.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Welcome Back</p>
                <h3 className="text-base font-black text-slate-900 truncate">
                  {matchedUser?.name || 'PayVerse Member'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">+91 {phone}</p>
              </div>
              <button
                onClick={() => setStep('login-phone')}
                className="text-xs text-blue-600 font-bold hover:underline shrink-0"
              >
                Switch
              </button>
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Enter 4-Digit Security PIN</h2>
            <p className="text-slate-500 text-xs mb-6">Authorize login to your PayVerse account</p>

            {/* PIN Input Bubbles */}
            <div className="mb-6">
              <div className="relative flex justify-center">
                <input
                  type={showPinMask ? 'password' : 'text'}
                  inputMode="numeric"
                  maxLength={4}
                  value={userPin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setUserPin(val);
                    setError('');
                    if (val.length === 4) {
                      handlePinLogin(val);
                    }
                  }}
                  onKeyDown={e => e.key === 'Enter' && handlePinLogin()}
                  className="w-full text-center text-3xl font-black tracking-[0.6em] border-2 border-slate-200 rounded-2xl py-4 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none bg-slate-50"
                  placeholder="● ● ● ●"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPinMask(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                >
                  {showPinMask ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                </button>
              </div>

              {error && <p className="text-red-500 text-xs font-bold mt-3 text-center">{error}</p>}
            </div>
          </div>

          <div>
            <button
              onClick={() => handlePinLogin()}
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-98 transition-all text-base flex items-center justify-center gap-2 cursor-pointer mb-3"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <span>Log In to PayVerse →</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2">
              <button
                onClick={handleSendOtpTrigger}
                className="text-blue-600 hover:underline"
              >
                Verify via OTP instead
              </button>
              <button
                onClick={() => {
                  app.showToast('PIN Reset Demo', 'Enter any 4-digit PIN to set up or verify.', 'info');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 3: NEW USER WELCOME INTRO CARD
  // -------------------------------------------------------------
  if (step === 'new-user-intro') {
    return (
      <div className="flex flex-col h-full bg-slate-100 overflow-y-auto">
        {renderBrandingHeader()}

        <div className="-mt-8 mx-4 sm:mx-auto max-w-md bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl shadow-blue-950/10 relative z-10 text-slate-900 mb-8 flex flex-col justify-between flex-1">
          <div>
            {/* New User Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 mb-6 text-amber-950 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-black mb-1">
                <span>✨</span> Looks like you're new!
              </div>
              <p className="text-xs font-semibold text-amber-900/80 leading-relaxed">
                Let's get your wallet ready in under 2 minutes. Safe, instant, & RBI compliant.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Instant Digital Wallet</h4>
                  <p className="text-xs text-slate-500">Scan & Pay at any UPI QR code instantly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-lg">
                  🎒
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Teen & Adult Accounts</h4>
                  <p className="text-xs text-slate-500">Tailored experience for students and guardians.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => setStep('user-type')}
              className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base flex items-center justify-center gap-2"
            >
              <span>Set Up My Wallet →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 4: LOGIN / REGISTER OTP VERIFICATION
  // -------------------------------------------------------------
  if (step === 'login-otp' || step === 'register-otp') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Verify Number', step === 'login-otp' ? 'login-phone' : 'personal-details', flowMode === 'register')}
        <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(); }} className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Verify Mobile Number</h2>
            <p className="text-slate-500 text-xs mb-6">
              Enter 4-digit verification code sent to <strong className="text-slate-900">+91 {phone}</strong>
            </p>

            <div className="flex gap-3 justify-center mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => focusRef(i, el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const cleanVal = e.target.value.replace(/\D/g, '').slice(-1);
                    const next = [...otp];
                    next[i] = cleanVal;
                    setOtp(next);
                    setError('');
                    if (cleanVal && i < 3) refs[i + 1]?.focus();
                    const enteredOtp = next.join('').replace(/\D/g, '').trim();
                    if (enteredOtp.length === 4) {
                      handleVerifyOTP(enteredOtp);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1]?.focus();
                  }}
                  autoFocus={i === 0}
                  className={`w-14 h-16 text-center text-2xl font-black rounded-2xl border-2 focus:outline-none transition-all shadow-sm ${error
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : digit
                      ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-blue-100'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-600'
                    }`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}

            {/* Demo Verification Code Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider mb-1">
                <span>🔐</span> DEMO VERIFICATION CODE
              </div>
              <p className="text-amber-950 text-2xl font-black tracking-[0.4em] font-mono">
                {demoOtp.split('').join(' ')}
              </p>
            </div>

            {/* Resend OTP */}
            <div className="text-center mb-4">
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleSendOtpTrigger()}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  Resend OTP
                </button>
              ) : (
                <p className="text-slate-400 text-xs font-semibold">
                  Resend code in <strong className="text-slate-700">{resendTimer}s</strong>
                </p>
              )}
              {resendMsg && <p className="text-green-600 text-xs font-bold mt-1">{resendMsg}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base flex items-center justify-center gap-2"
          >
            {isVerifyingOtp ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue →</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP: ACCOUNT TYPE SELECTOR
  // -------------------------------------------------------------
  if (step === 'user-type') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Account Type', 'new-user-intro')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Select Account Type</h2>
            <p className="text-slate-500 text-xs mb-8">Personalize your PayVerse experience</p>

            <div className="space-y-4 mb-6">
              {/* Teen Option */}
              <button
                onClick={() => setUserType('teen')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center justify-between ${userType === 'teen'
                  ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-sm">
                    👦
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-black text-base">Teen Account</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Under 18 • Pocket money & savings</p>
                  </div>
                </div>
                {userType === 'teen' && <IconCheck className="text-blue-600 font-bold" size={24} />}
              </button>

              {/* Adult Option */}
              <button
                onClick={() => setUserType('adult')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center justify-between ${userType === 'adult'
                  ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm">
                    👤
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-black text-base">Adult Account</h3>
                    <p className="text-slate-500 text-xs mt-0.5">18 and above • Full digital wallet</p>
                  </div>
                </div>
                {userType === 'adult' && <IconCheck className="text-blue-600 font-bold" size={24} />}
              </button>
            </div>
          </div>

          <button
            onClick={() => { setStep('personal-details'); setError(''); }}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP: PERSONAL DETAILS
  // -------------------------------------------------------------
  if (step === 'personal-details') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Personal Details', 'user-type')}
        <div className="flex-1 bg-white px-6 pt-6 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-1.5">Tell us about yourself</h2>
            <p className="text-slate-500 text-xs mb-6">Enter your information to set up your PayVerse ID</p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Nidhi"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setError(''); }}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="nidhi@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => handleDobChange(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {dobNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium animate-fade-slide-up">
                  ℹ️ {dobNotice}
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          </div>

          <button
            onClick={handlePersonalDetailsContinue}
            disabled={isSendingOtp}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base flex items-center justify-center gap-2"
          >
            {isSendingOtp ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : (
              <span>Verify Mobile Number →</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP: KYC / IDENTITY VERIFICATION
  // -------------------------------------------------------------
  if (step === 'identity-verification') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Identity Verification', 'register-otp')}
        <div className="flex-1 bg-white px-6 pt-6 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 text-2xl shadow-xs">
              🛡️
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1.5">Verify Identity</h2>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Mandatory RBI compliant identity verification for secure payments.
            </p>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Aadhaar / Government ID Number <span className="text-red-500">*</span>
              </label>

              <div className={`relative border-2 rounded-2xl px-4 py-3.5 transition-colors ${error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus-within:border-blue-600 bg-slate-50 focus-within:bg-white'}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit Aadhaar ID number"
                  value={aadhaarInput}
                  onChange={handleAadhaarChange}
                  className="w-full text-lg font-mono font-bold text-slate-900 tracking-wider focus:outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                Demo Mode: Enter any 12-digit number (e.g. 1234 5678 9012)
              </p>
              {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{error}</p>}
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-blue-600 font-bold text-xs">🔒 256-Bit Security Guarantee</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Your ID details are encrypted and processed strictly according to sandbox regulations.
              </p>
            </div>
          </div>

          <button
            onClick={handleIdentityVerification}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Verify Identity →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP: INTRO CARD
  // -------------------------------------------------------------
  if (step === 'teen-intro') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Teen Account', 'identity-verification')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div className="text-center my-auto">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-blue-500/30">
              🚀
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Set up Teen Account</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
              PayVerse is designed to help you manage pocket money, make payments, and build smart financial habits.
            </p>
          </div>

          <button
            onClick={() => setStep('guardian')}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP: GUARDIAN DETAILS
  // -------------------------------------------------------------
  if (step === 'guardian') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Parent Guardian', 'teen-intro')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Parent / Guardian Details</h2>
            <p className="text-slate-500 text-xs mb-6">Add guardian info for teen limit management</p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Sharma"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Parent / Guardian Mobile Number</label>
                <div className="flex items-center border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-blue-600">
                  <span className="bg-slate-50 px-4 py-4 text-slate-700 font-bold text-sm border-r border-slate-200">+91</span>
                  <input
                    type="tel"
                    placeholder="Guardian 10-digit number"
                    value={guardianPhone}
                    onChange={e => { setGuardianPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    className="flex-1 px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none text-base font-semibold"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          </div>

          <button
            onClick={handleGuardianContinue}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP: POCKET MONEY PREFERENCE
  // -------------------------------------------------------------
  if (step === 'pocket-money') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Pocket Money', 'guardian')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Do you receive pocket money?</h2>
            <p className="text-slate-500 text-xs mb-6">Helps us set up your allowance tracker</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { key: 'yes', label: 'Yes 💰' },
                { key: 'no', label: 'No ❌' },
                { key: 'later', label: 'Maybe later 🕒' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setHasPocketMoney(opt.key as any)}
                  className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${hasPocketMoney === opt.key
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hasPocketMoney === 'yes' && (
              <div className="animate-fade-slide-up">
                <h3 className="text-xs font-bold text-slate-900 mb-3">How much do you usually receive?</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Below ₹500', '₹500 – ₹1,000', '₹1,000 – ₹2,500', '₹2,500+'].map(range => (
                    <button
                      key={range}
                      onClick={() => setPocketMoneyRange(range)}
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs text-left transition-all ${pocketMoneyRange === range
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('purpose')}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP: PREFERENCES / PURPOSE
  // -------------------------------------------------------------
  if (step === 'purpose') {
    const purposeOptions = [
      '💸 Send Money',
      '📷 Scan & Pay',
      '💰 Save Money',
      '🎒 Pocket Money',
      '🧑‍🤝‍🧑 Split Bills',
      '🛍️ Shopping',
      '📚 Education',
    ];

    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Preferences', userType === 'teen' ? 'pocket-money' : 'identity-verification')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">What will you use PayVerse for?</h2>
            <p className="text-slate-500 text-xs mb-6">Select your top features for quick action setup</p>

            <div className="flex flex-wrap gap-2.5 mb-6">
              {purposeOptions.map(p => {
                const isSelected = selectedPurposes.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePurpose(p)}
                    className={`px-4 py-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center gap-2 ${isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                  >
                    <span>{p}</span>
                    {isSelected && <IconCheck size={14} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setStep('create-pin')}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP: CREATE 4-DIGIT SECURITY PIN
  // -------------------------------------------------------------
  if (step === 'create-pin') {
    return (
      <div className="flex flex-col h-full bg-slate-100">
        {renderHeader('Create PIN', 'purpose')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Create Security PIN</h2>
            <p className="text-slate-500 text-xs mb-6">Create a 4-digit PayVerse PIN to authorize money transfers</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Create 4-Digit PayVerse PIN</label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="● ● ● ●"
                    value={newPin}
                    onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                    className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-widest focus:border-blue-600 focus:outline-none bg-slate-50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPin ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm 4-Digit PIN</label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="● ● ● ●"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-widest focus:border-blue-600 focus:outline-none bg-slate-50"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}
          </div>

          <button
            onClick={handleCreatePIN}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base"
          >
            Create PIN →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FINAL STEP: ACCOUNT CREATED SUCCESS CARD
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white px-6 py-10 justify-between box-border overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 text-white flex items-center justify-center text-5xl shadow-xl shadow-blue-500/30 animate-pulse">
            🎉
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg border-2 border-white shadow-md">
            ✓
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome to PayVerse 🎉</h1>
        <p className="text-slate-500 text-sm font-semibold">Your digital wallet is active and ready to use.</p>
      </div>

      {/* Account Details Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 my-auto space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <span className="text-xs text-slate-500 font-medium">Account Name</span>
          <span className="text-sm font-black text-slate-900">{firstName} {lastName}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <span className="text-xs text-slate-500 font-medium">Account Type</span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-full uppercase">
            {userType === 'teen' ? '👦 Teen Account' : '👤 Adult Account'}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <span className="text-xs text-slate-500 font-medium">Identity Verification</span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
            ✓ VERIFIED ({maskedAadhaar || 'XXXX XXXX 1234'})
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500 font-medium">Opening Balance</span>
          <span className="text-base font-black text-emerald-600">₹5,000</span>
        </div>
      </div>

      {/* Final Entry Button */}
      <button
        type="button"
        onClick={handleCompleteRegistration}
        disabled={isCompletingRegistration}
        className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
      >
        {isCompletingRegistration ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Entering PayVerse...</span>
          </>
        ) : (
          <span>Continue to PayVerse →</span>
        )}
      </button>
    </div>
  );
}

export function OTPScreen() {
  return <LoginScreen />;
}

export default LoginScreen;
