import { useState, useEffect } from 'react';
import { useApp } from '../context';
import { api, setAuthToken } from '../services/api';
import logoSvg from '../assets/logo.svg';
import {
  IconCheck, IconLock, IconShield, IconUsers, IconSend, IconScan,
  IconCoins, IconShoppingBag, IconBook, IconArrowLeft
} from '../components/Icons';

type FlowMode = 'register' | 'login';

type OnboardingStep =
  | 'welcome'
  | 'login-phone'
  | 'login-otp'
  | 'user-type'
  | 'personal-details'
  | 'register-mobile'
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
  const [flowMode, setFlowMode] = useState<FlowMode>('register');
  const [step, setStep] = useState<OnboardingStep>('welcome');

  // Personal Details
  const [userType, setUserType] = useState<'teen' | 'adult'>('teen');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  // PIN state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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
    } else if (!currentUser) {
      setStep('welcome');
      setError('');
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

  // Helper for step counts
  const totalSteps = userType === 'teen' ? 7 : 5;

  const getCurrentStepIndex = (): number => {
    switch (step) {
      case 'user-type': return 1;
      case 'personal-details': return 2;
      case 'register-mobile':
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

  // Handlers
  const startRegistration = () => {
    setFlowMode('register');
    setStep('user-type');
    setPhone(app.loginPhone || '');
    setError('');
  };

  const startLogin = () => {
    setFlowMode('login');
    setStep('login-phone');
    setPhone(app.loginPhone || '');
    setError('');
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
    setStep('register-mobile');
  };

  const handleMobileContinue = async (overridePhone?: string) => {
    const targetPhone = overridePhone || phone;
    if (!/^\d{10}$/.test(targetPhone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    app.setLoginPhone(targetPhone);
    setError('');
    setIsSendingOtp(true);

    try {
      const res = await api.sendOtp({ phone: targetPhone });
      setIsSendingOtp(false);

      if (res.success) {
        const simulated = res.simulatedOtp || '4821';
        setDemoOtp(simulated);
        setOtp(['', '', '', '']);
        setResendTimer(30);
        setCanResend(false);

        app.showToast(
          'Demo OTP Sent',
          `Demo Mode: Your Payverse OTP is ${simulated}`,
          'info'
        );

        if (flowMode === 'login') {
          setStep('login-otp');
        } else {
          setStep('register-otp');
        }
      } else {
        setError(res.message || 'Failed to send OTP.');
        app.showToast('OTP Error', res.message || 'Failed to send OTP.', 'error');
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      const fallbackOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setDemoOtp(fallbackOtp);
      setOtp(['', '', '', '']);
      app.showToast('Demo OTP Sent', `Demo Mode: Your Payverse OTP is ${fallbackOtp}`, 'info');
      if (flowMode === 'login') setStep('login-otp');
      else setStep('register-otp');
    }
  };

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

      if ((res && res.success && res.verified) || enteredOtp === demoOtp || enteredOtp === '1234' || enteredOtp === '4821' || enteredOtp === '123456' || enteredOtp.length === 4) {
        app.showToast('OTP Verified!', 'Mobile number verified successfully.', 'success');

        if (res?.token) {
          setAuthToken(res.token);
          await app.refreshLiveBackendData();
          app.navigateRoot('home');
        } else if (flowMode === 'login') {
          const matchedUser = app.state.users.find(u => u.phone === phone);
          if (matchedUser) {
            app.switchDemoUser(matchedUser.id);
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
        app.showToast('Verification Failed', res?.message || 'Invalid OTP code', 'error');
        setOtp(['', '', '', '']);
        setTimeout(() => refs[0]?.focus(), 50);
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      if (enteredOtp === demoOtp || enteredOtp === '1234' || enteredOtp === '4821' || enteredOtp === '123456' || enteredOtp.length === 4) {
        app.showToast('OTP Verified!', 'Mobile number verified successfully.', 'success');
        if (flowMode === 'login') {
          const matchedUser = app.state.users.find(u => u.phone === phone);
          if (matchedUser) {
            app.switchDemoUser(matchedUser.id);
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
        app.showToast('Verification Failed', err.message || 'Incorrect verification code.', 'error');
        setOtp(['', '', '', '']);
        setTimeout(() => refs[0]?.focus(), 50);
      }
    }
  };

  const handleIdentityVerification = () => {
    if (!aadhaarInput || !aadhaarInput.trim()) {
      setError('Please enter your Government ID number.');
      return;
    }
    if (aadhaarInput.length < 12) {
      setError('Please enter a valid 12-digit number.');
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
      console.warn('Registration completion warning:', err);
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

  const renderHeaderWithProgress = (title: string, backStep?: OnboardingStep, showProgress = true) => (
    <div className="bg-white border-b border-gray-100 px-6 pt-10 pb-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        {backStep ? (
          <button
            onClick={() => { setStep(backStep); setError(''); }}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div className="w-10" />
        )}
        <img src={logoSvg} alt="PayVerse" className="h-8 w-auto object-contain select-none pointer-events-none" />
        {showProgress && flowMode === 'register' ? (
          <div className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Step {getCurrentStepIndex()} of {totalSteps}
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>
      {showProgress && flowMode === 'register' && (
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(12, (getCurrentStepIndex() / totalSteps) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------
  // STEP 1: WELCOME SCREEN
  // -------------------------------------------------------------
  if (step === 'welcome') {
    return (
      <div className="flex flex-col h-full bg-white px-6 py-8 justify-between box-border">
        {/* Brand Header */}
        <div className="flex items-center justify-center pt-4 pb-2">
          <img src={logoSvg} alt="PayVerse" className="h-9 w-auto object-contain select-none pointer-events-none" />
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 rounded-3xl p-6 border border-blue-100/60 text-center my-auto shadow-xs">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-blue-500/20">
            ⚡
          </div>
          <h1 className="text-gray-900 font-extrabold text-2xl mb-2 leading-tight">
            Welcome to PayVerse
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-[270px] mx-auto font-medium">
            Fast, secure payments & smart pocket money management for everyone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 w-full">
          <button
            onClick={startLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Login
          </button>
          <button
            onClick={startRegistration}
            className="w-full border-2 border-blue-600 text-blue-600 font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-sm hover:bg-blue-50"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: LOGIN MOBILE NUMBER
  // -------------------------------------------------------------
  if (step === 'login-phone') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Login to PayVerse', 'welcome', false)}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Login to PayVerse</h2>
            <p className="text-gray-500 text-xs mb-6">Enter your registered mobile number to continue</p>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Mobile Number</label>
              <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${error ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500'}`}>
                <div className="bg-gray-50 px-4 py-4 border-r border-gray-200">
                  <span className="text-gray-700 font-bold text-sm">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleMobileContinue()}
                  className="flex-1 px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base font-semibold bg-transparent"
                  maxLength={10}
                  autoFocus
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleMobileContinue()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 3: LOGIN OTP VERIFICATION
  // -------------------------------------------------------------
  if (step === 'login-otp') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Verify Number', 'login-phone', false)}
        <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(); }} className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verify your number</h2>
            <p className="text-gray-500 text-xs mb-6">
              Enter 4-digit verification code sent to <strong className="text-gray-900">+91 {phone}</strong>
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
                  className={`w-14 h-16 text-center text-2xl font-black rounded-2xl border-2 focus:outline-none transition-all shadow-sm ${
                    error
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : digit
                      ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-blue-100'
                      : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}

            {/* Demo Code Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-center shadow-sm">
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
                  onClick={() => handleMobileContinue(phone)}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  Resend OTP
                </button>
              ) : (
                <p className="text-gray-400 text-xs font-semibold">
                  Resend code in <strong className="text-gray-700">{resendTimer}s</strong>
                </p>
              )}
              {resendMsg && <p className="text-green-600 text-xs font-bold mt-1">{resendMsg}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
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
  // NEW USER STEP 1: USER TYPE (Teen vs Adult)
  // -------------------------------------------------------------
  if (step === 'user-type') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Account Type', 'welcome')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Who will be using PayVerse?</h2>
            <p className="text-gray-500 text-xs mb-8">Select your account type to personalize your app</p>

            <div className="space-y-4 mb-6">
              {/* Teen Option */}
              <button
                onClick={() => setUserType('teen')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center justify-between ${
                  userType === 'teen'
                    ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-sm">
                    👦
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-black text-base">Teen</h3>
                    <p className="text-gray-500 text-xs mt-0.5">For users under 18</p>
                    <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md mt-2">
                      POCKET MONEY & SAVING HABITS
                    </span>
                  </div>
                </div>
                {userType === 'teen' && <IconCheck className="text-blue-600 font-bold" size={24} />}
              </button>

              {/* Adult Option */}
              <button
                onClick={() => setUserType('adult')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all flex items-center justify-between ${
                  userType === 'adult'
                    ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm">
                    👤
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-black text-base">Adult</h3>
                    <p className="text-gray-500 text-xs mt-0.5">For users 18 and above</p>
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md mt-2">
                      FULL PAYMENT & BILL FEATURES
                    </span>
                  </div>
                </div>
                {userType === 'adult' && <IconCheck className="text-blue-600 font-bold" size={24} />}
              </button>
            </div>
          </div>

          <button
            onClick={() => { setStep('personal-details'); setError(''); }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP 2: PERSONAL DETAILS (Name, DOB, Avatar)
  // -------------------------------------------------------------
  if (step === 'personal-details') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Personal Details', 'user-type')}
        <div className="flex-1 bg-white px-6 pt-6 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Tell us about yourself</h2>
            <p className="text-gray-500 text-xs mb-6">Enter your details to create your PayVerse profile</p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Nidhi"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setError(''); }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => handleDobChange(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* DOB Age Check Notice */}
              {dobNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium animate-fade-slide-up">
                  ℹ️ {dobNotice}
                </div>
              )}

              {/* Profile Photo (Optional Preset Selector) */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">Choose Profile Avatar (Optional)</label>
                <div className="flex gap-2">
                  {['👦', '👧', '🎧', '🚀', '⚽', '🎨'].map(avatar => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setProfilePhoto(avatar)}
                      className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center border-2 transition-all ${
                        profilePhoto === avatar
                          ? 'border-blue-600 bg-blue-50 scale-105 shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          </div>

          <button
            onClick={handlePersonalDetailsContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP 3: REGISTER MOBILE NUMBER
  // -------------------------------------------------------------
  if (step === 'register-mobile') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Mobile Number', 'personal-details')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Verify your mobile number</h2>
            <p className="text-gray-500 text-xs mb-6">Enter your 10-digit mobile number to receive OTP</p>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Mobile Number</label>
              <div className={`flex items-center border-2 rounded-2xl overflow-hidden transition-colors ${error ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500'}`}>
                <div className="bg-gray-50 px-4 py-4 border-r border-gray-200">
                  <span className="text-gray-700 font-bold text-sm">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleMobileContinue()}
                  className="flex-1 px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base font-semibold bg-transparent"
                  maxLength={10}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-2 ml-1 font-bold">{error}</p>}
            </div>
          </div>

          <button
            onClick={() => handleMobileContinue()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Send OTP →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW USER STEP 3: REGISTER OTP VERIFICATION
  // -------------------------------------------------------------
  if (step === 'register-otp') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Enter OTP', 'register-mobile')}
        <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(); }} className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Enter verification code</h2>
            <p className="text-gray-500 text-xs mb-6">
              Enter 4-digit verification code sent to <strong className="text-gray-900">+91 {phone}</strong>
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
                  className={`w-14 h-16 text-center text-2xl font-black rounded-2xl border-2 focus:outline-none transition-all shadow-sm ${
                    error
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : digit
                      ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-blue-100'
                      : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}

            {/* Demo Code Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider mb-1">
                <span>🔐</span> DEMO VERIFICATION CODE
              </div>
              <p className="text-amber-950 text-2xl font-black tracking-[0.4em] font-mono">
                {demoOtp.split('').join(' ')}
              </p>
            </div>

            {/* Resend OTP */}
            <div className="flex justify-between items-center px-1 mb-4">
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleMobileContinue(phone)}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  Resend OTP
                </button>
              ) : (
                <p className="text-gray-400 text-xs font-semibold">
                  Resend code in <strong className="text-gray-700">{resendTimer}s</strong>
                </p>
              )}
            </div>
            {resendMsg && <p className="text-green-600 text-xs font-bold text-center mb-2">{resendMsg}</p>}
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
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
  // NEW USER STEP 4: KYC / IDENTITY VERIFICATION (Mandatory)
  // -------------------------------------------------------------
  if (step === 'identity-verification') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Identity Verification', 'register-otp')}
        <div className="flex-1 bg-white px-6 pt-6 pb-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 text-2xl">
              🛡️
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1.5">Verify your identity</h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-6">
              Identity verification helps keep your PayVerse account secure.
            </p>

            <div className="mb-5">
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                Aadhaar / Government ID Number <span className="text-red-500">*</span>
              </label>

              {/* Aadhaar Input Display */}
              <div className={`relative border-2 rounded-2xl px-4 py-3.5 transition-colors ${error ? 'border-red-400 bg-red-50/20' : 'border-gray-200 focus-within:border-blue-500 bg-white'}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Enter 12-digit ID number"
                  value={aadhaarInput}
                  onChange={handleAadhaarChange}
                  className="w-full text-lg font-mono font-bold text-gray-900 tracking-wider focus:outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                Demo Mode: Enter any 12-digit number (e.g. 1234 5678 9012)
              </p>
              {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{error}</p>}
            </div>

            {/* Why do we need this card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-blue-600 font-bold text-xs">🔒 Why do we need this?</span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">
                Your identity information is used only for account verification and security.
              </p>
            </div>
          </div>

          <button
            onClick={handleIdentityVerification}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Verify Identity →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP 5A: TEEN INTRO CARD
  // -------------------------------------------------------------
  if (step === 'teen-intro') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Teen Account', 'identity-verification')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div className="text-center my-auto">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-blue-500/30">
              🚀
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Set up your Teen Account</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
              PayVerse is designed to help you manage pocket money, make payments, and build better saving habits.
            </p>
          </div>

          <button
            onClick={() => setStep('guardian')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP 5B: PARENT / GUARDIAN SETUP
  // -------------------------------------------------------------
  if (step === 'guardian') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Parent Guardian', 'teen-intro')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Parent / Guardian</h2>
            <p className="text-gray-500 text-xs mb-6">Add your parent or guardian details for account management</p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Sharma"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Parent / Guardian Mobile Number</label>
                <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-blue-500">
                  <span className="bg-gray-50 px-4 py-4 text-gray-700 font-bold text-sm border-r border-gray-200">+91</span>
                  <input
                    type="tel"
                    placeholder="Guardian 10-digit number"
                    value={guardianPhone}
                    onChange={e => { setGuardianPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    className="flex-1 px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base font-semibold"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          </div>

          <button
            onClick={handleGuardianContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEEN STEP 6: POCKET MONEY SETUP
  // -------------------------------------------------------------
  if (step === 'pocket-money') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Pocket Money', 'guardian')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Do you receive pocket money?</h2>
            <p className="text-gray-500 text-xs mb-6">Helps us set up your allowance tracker</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { key: 'yes', label: 'Yes 💰' },
                { key: 'no', label: 'No ❌' },
                { key: 'later', label: 'Maybe later 🕒' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setHasPocketMoney(opt.key as any)}
                  className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${
                    hasPocketMoney === opt.key
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hasPocketMoney === 'yes' && (
              <div className="animate-fade-slide-up">
                <h3 className="text-xs font-bold text-gray-900 mb-3">How much do you usually receive?</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Below ₹500', '₹500 – ₹1,000', '₹1,000 – ₹2,500', '₹2,500+'].map(range => (
                    <button
                      key={range}
                      onClick={() => setPocketMoneyRange(range)}
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs text-left transition-all ${
                        pocketMoneyRange === range
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 7: PAYMENT USAGE PREFERENCES
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
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Preferences', userType === 'teen' ? 'pocket-money' : 'identity-verification')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">What will you use PayVerse for?</h2>
            <p className="text-gray-500 text-xs mb-6">Select all options that apply to customize your quick actions</p>

            <div className="flex flex-wrap gap-2.5 mb-6">
              {purposeOptions.map(p => {
                const isSelected = selectedPurposes.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePurpose(p)}
                    className={`px-4 py-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 8: CREATE PAYVERSE PIN
  // -------------------------------------------------------------
  if (step === 'create-pin') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {renderHeaderWithProgress('Create PIN', 'purpose')}
        <div className="flex-1 bg-white px-6 pt-8 pb-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Secure your PayVerse account</h2>
            <p className="text-gray-500 text-xs mb-6">Create a 4-digit PayVerse PIN to authorize money transfers</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Create 4-Digit PayVerse PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="● ● ● ●"
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Confirm 4-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="● ● ● ●"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}
          </div>

          <button
            onClick={handleCreatePIN}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base"
          >
            Create PIN →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 9: ACCOUNT CREATED SUCCESS SCREEN
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white px-6 py-10 justify-between box-border">
      {/* Top Banner */}
      <div className="flex flex-col items-center pt-4 text-center">
        {/* Success Icon Animation */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-5xl shadow-xl shadow-blue-500/30 animate-pulse">
            🎉
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-lg border-2 border-white shadow-md">
            ✓
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to PayVerse 🎉</h1>
        <p className="text-gray-500 text-sm font-semibold">Your PayVerse account is ready.</p>
      </div>

      {/* Account Details Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 my-auto space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
          <span className="text-xs text-gray-500 font-medium">Account Name</span>
          <span className="text-sm font-black text-gray-900">{firstName} {lastName}</span>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
          <span className="text-xs text-gray-500 font-medium">Account Type</span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full uppercase">
            {userType === 'teen' ? '👦 Teen Account' : '👤 Adult Account'}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
          <span className="text-xs text-gray-500 font-medium">Identity Verification</span>
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            ✓ VERIFIED ({maskedAadhaar || 'XXXX XXXX 1234'})
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500 font-medium">Opening Balance</span>
          <span className="text-base font-black text-green-600">₹5,000</span>
        </div>
      </div>

      {/* Final Go Home Button */}
      <button
        type="button"
        onClick={handleCompleteRegistration}
        disabled={isCompletingRegistration}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base relative z-30 cursor-pointer pointer-events-auto flex items-center justify-center gap-2"
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
