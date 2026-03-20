// ============================================================
// FILE: CustomerAuth.tsx  (UPDATED — Guest Mode Fix)
// SECTION: 3_customer > auth > pages
// KEY CHANGE: Guest mode now uses supabase.auth.signInAnonymously()
//             instead of localStorage — so guest ID never changes,
//             survives refresh, and orders are properly tracked.
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Flame, Eye, EyeOff, Loader2, ArrowLeft,
    Phone, Mail, User, Lock, UserCheck,
    ShieldAlert, KeyRound
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import type { AuthView, IdentifierType } from '@/3_customer/types/customer';

// ── Rate limiting helper ───────────────────────────────────────
const createRateLimiter = (maxAttempts: number = 5, windowMs: number = 5 * 60 * 1000) => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return {
        isLimited: (key: string): boolean => {
            const now = Date.now();
            const record = attempts.get(key);
            
            if (!record || now > record.resetTime) {
                attempts.set(key, { count: 1, resetTime: now + windowMs });
                return false;
            }
            
            if (record.count >= maxAttempts) {
                return true;
            }
            
            record.count++;
            return false;
        },
        reset: (key: string) => attempts.delete(key),
    };
};

const authRateLimiter = createRateLimiter(5, 5 * 60 * 1000);

// ── Helpers ───────────────────────────────────────────────────
const detectIdentifierType = (value: string): IdentifierType =>
    value.includes('@') ? 'email' : 'phone';

const phoneToEmail = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    return `${digits}@saysavor.app`;
};

const getSupabaseEmail = (identifier: string, type: IdentifierType): string =>
    type === 'email' ? identifier : phoneToEmail(identifier);

const formatPhone = (value: string): string =>
    value.replace(/[^\d+\s\-()]/g, '');

const validatePhoneFormat = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
};

const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
};

// ── Brand Panel (left side, desktop) ─────────────────────────
const BrandPanel: React.FC = () => (
    <div
        className="hidden lg:flex w-[60%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: '#1A0A00' }}
    >
        <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 40% 60%, rgba(255,105,51,0.18) 0%, rgba(26,10,0,1) 70%)' }}
        />
        <div className="absolute inset-0 opacity-35 mix-blend-luminosity grayscale">
            <img
                src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=70"
                alt="Food"
                className="w-full h-full object-cover blur-sm"
            />
        </div>
        <header className="relative z-10 flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#FF6B35' }}>
                <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">SaySavor</span>
        </header>
        <div className="relative z-10 mb-20">
            <h1 className="text-6xl font-extrabold text-white mb-4 leading-tight">
                Hunger Ends<br /><span style={{ color: '#FF6B35' }}>Here.</span>
            </h1>
            <p className="text-xl font-light" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Discover the best food from the heart of Pakistan.
            </p>
        </div>
        <footer className="relative z-10 flex flex-wrap gap-3">
            {['🎙️ Voice Ordering', '🌟 Savor Points', '🚀 30 Min Delivery'].map(label => (
                <div key={label} className="px-5 py-3 rounded-full text-white text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {label}
                </div>
            ))}
        </footer>
    </div>
);

// ── Main Component ────────────────────────────────────────────
const CustomerAuth: React.FC = () => {
    const navigate = useNavigate();
    const { enableGuestMode } = useCustomerAuth();

    const [view, setView] = useState<AuthView>('IDENTIFIER_ENTRY');
    const [identifier, setIdentifier] = useState('');
    const [identifierType, setIdentifierType] = useState<IdentifierType>('phone');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                // Any authenticated user (including anonymous) goes to home
                navigate('/foodie/home', { replace: true });
            }
        });
    }, [navigate]);

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const type = detectIdentifierType(val);
        const isPhone = /^[+\d]/.test(val) && !val.includes('@');
        setIdentifier(isPhone ? formatPhone(val) : val);
        setIdentifierType(type);
    };

    // Step 1: Check if user exists
    const handleIdentifierCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = identifier.trim();
        if (!id) return;
        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, role')
                .or(`email.eq.${id},phone.eq.${id}`)
                .maybeSingle();

            if (profile) {
                if ((profile as any).role === 'partner') {
                    toast.error('This account is a Partner account. Use the Partner login.');
                    setLoading(false);
                    return;
                }
                toast.info('Welcome back! Enter your password.');
                setView('LOGIN');
            } else {
                setView('SIGNUP');
            }
        } catch (err) {
            setView('SIGNUP');
        } finally {
            setLoading(false);
        }
    };

    // Step 2a: Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        // Check rate limiting
        if (authRateLimiter.isLimited(identifier)) {
            toast.error('Too many login attempts. Please try again in 5 minutes.');
            return;
        }

        setLoading(true);
        try {
            const email = getSupabaseEmail(identifier, identifierType);
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                toast.error(error.message === 'Invalid login credentials'
                    ? 'Wrong password. Try again.'
                    : error.message);
            } else {
                authRateLimiter.reset(identifier);
                toast.success('Welcome back! 🎉');
                navigate('/foodie/home');
            }
        } catch (err: any) {
            toast.error('Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2b: Signup
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error("Passwords don't match!"); return; }
        if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
        if (!name.trim()) { toast.error('Please enter your name.'); return; }
        setLoading(true);
        try {
            const email = getSupabaseEmail(identifier, identifierType);
            const { data: authData, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'customer',
                        full_name: name.trim(),
                        phone: identifierType === 'phone' ? identifier.trim() : null,
                        email: identifierType === 'email' ? identifier.trim() : null,
                    },
                },
            });

            if (signupError) {
                if (signupError.message.toLowerCase().includes('already registered')) {
                    toast.error('Account already exists! Please login.');
                    setView('LOGIN');
                } else {
                    toast.error(signupError.message);
                }
                return;
            }

            if (identifierType === 'email') {
                toast.success('Check your email for verification code! 📧');
                setView('OTP_VERIFY');
            } else {
                toast.success('Account created! Welcome to SaySavor 🎉');
                navigate('/foodie/home');
            }
        } catch (err) {
            toast.error('Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: OTP verify
    const handleOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim() || otp.length < 6) { toast.error('Enter the 6-digit code.'); return; }
        setLoading(true);
        try {
            const email = getSupabaseEmail(identifier, identifierType);
            const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: 'signup' });
            if (error) {
                toast.error('Invalid or expired code.');
            } else {
                toast.success('Email verified! Welcome 🎉');
                navigate('/foodie/home');
            }
        } catch (err) {
            toast.error('Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    // ── UPDATED: Guest mode uses Supabase signInAnonymously ───
    // This creates a PERSISTENT anonymous session.
    // Same user ID every time the customer visits (until they log out).
    // Their orders can be tracked properly.
    // They can later upgrade to a real account without losing order history.
    const handleGuestMode = async () => {
        setLoading(true);
        try {
            await enableGuestMode(); // calls supabase.auth.signInAnonymously()
            toast.success('Browsing as Guest 👤');
            navigate('/foodie/home');
        } catch (err: any) {
            toast.error('Could not start guest session. Please try again.');
            console.error('Guest mode error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Shared styles ─────────────────────────────────────────
    const inputClass = 'w-full py-4 px-4 bg-white border border-[#E5E0D8] rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-300 focus:border-[#FF6B35] transition-all text-base outline-none';
    const btnPrimary = 'w-full py-4 px-6 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg';

    return (
        <div className="flex h-screen w-full overflow-hidden" style={{ background: '#FAFAF8' }}>
            <BrandPanel />

            <section className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 lg:p-16 overflow-y-auto">
                <div className="w-full max-w-md space-y-8">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center justify-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FF6B35' }}>
                            <Flame className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">SaySavor</span>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* ═══ IDENTIFIER ENTRY ═══ */}
                        {view === 'IDENTIFIER_ENTRY' && (
                            <motion.div key="identifier" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <Flame className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Welcome to SaySavor</h2>
                                    <p className="text-gray-500 mt-2">Enter your phone or email to continue</p>
                                </div>
                                <form onSubmit={handleIdentifierCheck} className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center gap-1 pointer-events-none text-gray-400">
                                            {identifierType === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                        </div>
                                        <input
                                            type={identifierType === 'email' ? 'email' : 'tel'}
                                            value={identifier}
                                            onChange={handleIdentifierChange}
                                            placeholder="Phone number or Email"
                                            className={`${inputClass} pl-10`}
                                            required autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 pl-1">
                                        {identifierType === 'phone'
                                            ? '📱 Include country code: +923001234567'
                                            : '✉️ Email detected'}
                                    </p>
                                    <button type="submit" disabled={loading} className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}>
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue →</>}
                                    </button>
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                        <span className="text-gray-400 text-sm uppercase tracking-widest">or</span>
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                    </div>
                                    <button type="button" onClick={handleGuestMode} disabled={loading}
                                        className="w-full py-4 px-6 bg-transparent border-2 border-[#E5E0D8] text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                        Browse as Guest
                                    </button>
                                    <p className="text-center text-[10px] text-gray-400">
                                        Guest orders are saved to your session — upgrade anytime to a full account
                                    </p>
                                </form>
                            </motion.div>
                        )}

                        {/* ═══ LOGIN ═══ */}
                        {view === 'LOGIN' && (
                            <motion.div key="login" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <User className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back!</h2>
                                    <p className="text-gray-500 mt-2">Enter your password</p>
                                </div>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-[#E5E0D8]">
                                        <span className="text-gray-800 font-medium text-sm">{identifier}</span>
                                        <button type="button" onClick={() => setView('IDENTIFIER_ENTRY')}
                                            className="text-xs font-bold" style={{ color: '#FF6B35' }}>Change</button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input type={showPassword ? 'text' : 'password'} value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Password" className={`${inputClass} pl-10 pr-12`} required autoFocus />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button type="submit" disabled={loading} className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}>
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login →'}
                                    </button>
                                    <button type="button" onClick={() => { setView('IDENTIFIER_ENTRY'); setPassword(''); }}
                                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mx-auto text-sm font-medium">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ═══ SIGNUP ═══ */}
                        {view === 'SIGNUP' && (
                            <motion.div key="signup" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <Flame className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                                    <p className="text-gray-500 mt-2">Join thousands of Foodies</p>
                                </div>
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-[#E5E0D8]">
                                        <span className="text-gray-800 font-medium text-sm">{identifier}</span>
                                        <button type="button" onClick={() => setView('IDENTIFIER_ENTRY')}
                                            className="text-xs font-bold" style={{ color: '#FF6B35' }}>Change</button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><User className="w-4 h-4" /></div>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Your name" className={`${inputClass} pl-10`} required autoFocus />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><Lock className="w-4 h-4" /></div>
                                        <input type={showPassword ? 'text' : 'password'} value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Password (min 6 chars)" className={`${inputClass} pl-10 pr-12`} required />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><Lock className="w-4 h-4" /></div>
                                        <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm password" className={`${inputClass} pl-10 pr-12`} required />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400">
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button type="submit" disabled={loading} className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}>
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account →'}
                                    </button>
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                        <span className="text-gray-400 text-sm">or</span>
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                    </div>
                                    <button type="button" onClick={handleGuestMode} disabled={loading}
                                        className="w-full py-3 px-6 bg-transparent border-2 border-[#E5E0D8] text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        Continue as Guest instead
                                    </button>
                                    <button type="button" onClick={() => { setView('IDENTIFIER_ENTRY'); setPassword(''); setConfirmPassword(''); setName(''); }}
                                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mx-auto text-sm font-medium">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ═══ OTP ═══ */}
                        {view === 'OTP_VERIFY' && (
                            <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <KeyRound className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
                                    <p className="text-gray-500 mt-2">6-digit code sent to <strong>{identifier}</strong></p>
                                </div>
                                <form onSubmit={handleOtpVerify} className="space-y-4">
                                    <input type="text" inputMode="numeric" value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="Enter 6-digit code"
                                        className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
                                        required autoFocus maxLength={8} />
                                    <button type="submit" disabled={loading} className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}>
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify →'}
                                    </button>
                                    <button type="button" onClick={() => { setView('SIGNUP'); setOtp(''); }}
                                        className="flex items-center gap-2 text-gray-500 mx-auto text-sm">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                    </AnimatePresence>

                    <p className="text-center text-xs text-gray-400 px-4">
                        By continuing, you agree to SaySavor's Terms & Privacy Policy.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default CustomerAuth;
