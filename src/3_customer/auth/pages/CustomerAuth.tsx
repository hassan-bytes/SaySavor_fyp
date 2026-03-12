// ============================================================
// FILE: CustomerAuth.tsx
// SECTION: 3_customer > auth > pages
// PURPOSE: Customer ka smart auth page.
//          Phone ya Email dono accept karta hai.
//          Exists? → Login view | New? → Signup view
//          Guest mode bhi available hai.
// ROUTE: /foodie/auth
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Flame, Eye, EyeOff, Loader2, ArrowLeft,
    Phone, Mail, User, Lock, UserCheck, ShieldAlert, KeyRound
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { AuthView, IdentifierType } from '@/3_customer/types/customer';

// ── Helpers ───────────────────────────────────────────────────
const detectIdentifierType = (value: string): IdentifierType =>
    value.includes('@') ? 'email' : 'phone';

const phoneToEmail = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    return `${digits}@saysavor.app`;
};

const getSupabaseEmail = (identifier: string, type: IdentifierType): string =>
    type === 'email' ? identifier : phoneToEmail(identifier);

const formatPhone = (value: string): string => {
    // Strip non-digits, keep + for dial code
    return value.replace(/[^\d+\s\-()]/g, '');
};

// ── Slide animation variants ──────────────────────────────────
const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
};

// ── Left Panel ────────────────────────────────────────────────
const BrandPanel: React.FC = () => (
    <div
        className="hidden lg:flex w-[60%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: '#1A0A00' }}
    >
        {/* Radial glow */}
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                background: 'radial-gradient(circle at 40% 60%, rgba(255,105,51,0.18) 0%, rgba(26,10,0,1) 70%)',
            }}
        />

        {/* Food photo overlay */}
        <div className="absolute inset-0 opacity-35 mix-blend-luminosity grayscale">
            <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEH5GHAij1M6YVTNTEOaxGQyX0_l-dHwSqkqdPgeQffq0z9VEFBtpm7qWRhrthLIvsnC3RARIYXnslPc8ZtJdyXSDYX0c0Z__iaDgNZO9c3g87FrPZcaYFKxR7eKKO8I_mPDzHH6Iw_3DGQQyNyNxvIZsxBBWw3nGqQc-WlJIzOz3c4UvmvXX5O3ttK68FGPcB7tNLqkE9KQnMhj7L3nlw6CoznuUdKfSV6DdUGbkvIh6pVvb2hcJVG-D7_aFkDpO_Kg4EHC6CCE0"
                alt="Pakistani Food"
                className="w-full h-full object-cover blur-sm"
            />
        </div>

        {/* Logo */}
        <header className="relative z-10 flex items-center gap-2">
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
                style={{ background: '#FF6B35' }}
            >
                <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SaySavor</span>
        </header>

        {/* Headline */}
        <div className="relative z-10 flex flex-col items-start max-w-lg mb-20">
            <h1 className="text-6xl font-extrabold text-white mb-4 leading-tight">
                Hunger Ends<br />
                <span style={{ color: '#FF6B35' }}>Here.</span>
            </h1>
            <p className="text-xl font-light tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Discover the best food around you from the heart of Pakistan.
            </p>
        </div>

        {/* Feature pills */}
        <footer className="relative z-10 flex flex-wrap gap-3">
            {[
                { icon: '🎙️', label: 'Voice Ordering' },
                { icon: '🌟', label: 'Savor Points' },
                { icon: '🚀', label: '30 Min Delivery' },
            ].map(({ icon, label }) => (
                <div
                    key={label}
                    className="px-5 py-3 rounded-full text-white text-sm font-medium flex items-center gap-2"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <span>{icon}</span> {label}
                </div>
            ))}
        </footer>
    </div>
);

// ── Main Component ────────────────────────────────────────────
const CustomerAuth: React.FC = () => {
    const navigate = useNavigate();

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

    // ─── Check if already logged in ───────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.user_metadata?.role === 'customer') {
                navigate('/foodie/home', { replace: true });
            }
        });
    }, [navigate]);

    // ─── Auto-detect identifier type ──────────────────────────
    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Only format phone AFTER we're confident it's a phone (starts with + or digit)
        // Email detection: contains '@' → treat as email, no formatting
        const type = detectIdentifierType(val);
        const isDefinitelyPhone = /^[+\d]/.test(val) && !val.includes('@');
        const formatted = (type === 'phone' && isDefinitelyPhone) ? formatPhone(val) : val;
        setIdentifier(formatted);
        setIdentifierType(type);
    };

    // ─── Step 1: Identifier check — partner guard + route to SIGNUP/LOGIN ──
    const handleIdentifierCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = identifier.trim();
        if (!id) return;

        // Partner check only for email identifiers (partners always use email)
        if (identifierType === 'email') {
            setLoading(true);
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('email', id)
                    .maybeSingle();

                const existingProfile = profile as any;
                if (existingProfile && existingProfile.role === 'partner') {
                    toast.error('⚠️ Yeh email ek Partner account se linked hai. Partner customer nahi ho sakta.');
                    setLoading(false);
                    return;
                }

                // Check if customer already exists with this email
                const { data: existing } = await (supabase as any)
                    .from('customers')
                    .select('id')
                    .eq('email', id)
                    .maybeSingle();

                setLoading(false);
                if (existing) {
                    toast.info('Welcome back! Enter your password.');
                    setView('LOGIN');
                } else {
                    setView('SIGNUP');
                }
            } catch {
                setLoading(false);
                setView('SIGNUP');
            }
        } else {
            // Phone users — no partner check (partners use email only)
            setView('SIGNUP');
        }
    };

    // ─── Step 2a: Login ────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;
        setLoading(true);
        try {
            const supabaseEmail = getSupabaseEmail(identifier, identifierType);
            const { error } = await supabase.auth.signInWithPassword({
                email: supabaseEmail,
                password,
            });
            if (error) {
                console.error('Login error details:', error);
                toast.error(`Login failed: ${error.message}`);
            } else {
                toast.success('Welcome back! 🎉');
                navigate('/foodie/home');
            }
        } catch (err) {
            console.error('Unexpected login error:', err);
            toast.error('An unexpected error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 2b: Signup ───────────────────────────────────────
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error("Passwords don't match!"); return; }
        if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
        if (!name.trim()) { toast.error('Please enter your name.'); return; }
        setLoading(true);
        try {
            const supabaseEmail = getSupabaseEmail(identifier, identifierType);
            const { data: authData, error: signupError } = await supabase.auth.signUp({
                email: supabaseEmail,
                password,
                options: {
                    data: {
                        role: 'customer',
                        name: name.trim(),
                        phone: identifierType === 'phone' ? identifier.trim() : null,
                        email: identifierType === 'email' ? identifier.trim() : null,
                    },
                },
            });

            if (signupError) {
                console.error('Signup error details:', signupError);
                if (signupError.message.toLowerCase().includes('already registered')) {
                    toast.error('Account already exists! Please login.');
                    setView('LOGIN');
                } else {
                    toast.error(`Signup failed: ${signupError.message}`);
                }
                return;
            }

            // Insert into customers table (graceful)
            if (authData.user) {
                try {
                    const { error: insertError } = await (supabase as any).from('customers').insert({
                        id: authData.user.id,
                        phone: identifierType === 'phone' ? identifier.trim() : null,
                        email: identifierType === 'email' ? identifier.trim() : null,
                        name: name.trim(),
                        points: 0,
                    });
                    if (insertError) {
                        console.error('Customer profile insert failed (Expected if SQL not run):', insertError);
                    }
                } catch (err) {
                    console.error('Exception during customer insert:', err);
                }
            }

            // Email users → OTP verification; Phone users → direct home
            if (identifierType === 'email') {
                toast.success('Verification code sent to your email! 📧');
                setView('OTP_VERIFY');
            } else {
                toast.success('Account created! Welcome to SaySavor 🎉');
                navigate('/foodie/home');
            }
        } catch {
            toast.error('Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 3: OTP Verification (email users only) ───────────
    const handleOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim() || otp.length < 6) {
            toast.error('Please enter the 6-digit code.');
            return;
        }
        setLoading(true);
        try {
            const supabaseEmail = getSupabaseEmail(identifier, identifierType);
            const { error } = await supabase.auth.verifyOtp({
                email: supabaseEmail,
                token: otp.trim(),
                type: 'signup',
            });
            if (error) {
                toast.error('Invalid or expired code. Please try again.');
            } else {
                toast.success('Email verified! Welcome to SaySavor 🎉');
                navigate('/foodie/home');
            }
        } catch {
            toast.error('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Resend OTP ────────────────────────────────────────────
    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const supabaseEmail = getSupabaseEmail(identifier, identifierType);
            await supabase.auth.signUp({
                email: supabaseEmail,
                password,
                options: { data: { role: 'customer', name: name.trim() } },
            });
            toast.success('New code sent to your email!');
        } catch {
            toast.error('Failed to resend code.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Guest Mode ────────────────────────────────────────────
    const handleGuestMode = () => {
        localStorage.setItem('ss_guest_id', crypto.randomUUID());
        localStorage.setItem('ss_guest_mode', 'true');
        toast.success('Browsing as Guest 👤');
        navigate('/foodie/home');
    };

    // ─── Shared Input style ────────────────────────────────────
    const inputClass =
        'w-full py-4 px-4 bg-white border border-[#E5E0D8] rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-300 focus:border-[#FF6B35] transition-all text-base outline-none';

    const btnPrimary =
        'w-full py-4 px-6 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg';

    return (
        <div className="flex h-screen w-full overflow-hidden" style={{ background: '#FAFAF8' }}>
            {/* ── LEFT BRAND PANEL ── */}
            <BrandPanel />

            {/* ── RIGHT FORM PANEL ── */}
            <section className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 lg:p-16 overflow-y-auto">
                <div className="w-full max-w-md space-y-8">

                    {/* Logo (mobile only) */}
                    <div className="flex lg:hidden items-center justify-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FF6B35' }}>
                            <Flame className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">SaySavor</span>
                    </div>

                    {/* ── FORM VIEWS with AnimatePresence ── */}
                    <AnimatePresence mode="wait">

                        {/* ════ VIEW 1: IDENTIFIER ENTRY ════ */}
                        {view === 'IDENTIFIER_ENTRY' && (
                            <motion.div
                                key="identifier"
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <div
                                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                        style={{ background: 'rgba(255,107,53,0.1)' }}
                                    >
                                        <Flame className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Welcome to SaySavor</h2>
                                    <p className="text-gray-500 mt-2">Enter your phone or email to continue</p>
                                </div>

                                <form onSubmit={handleIdentifierCheck} className="space-y-4">
                                    {/* Smart identifier input */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center gap-1 pointer-events-none text-gray-400">
                                            {identifierType === 'phone'
                                                ? <Phone className="w-4 h-4" />
                                                : <Mail className="w-4 h-4" />
                                            }
                                        </div>
                                        <input
                                            type={identifierType === 'email' ? 'email' : 'tel'}
                                            value={identifier}
                                            onChange={handleIdentifierChange}
                                            placeholder="Phone number or Email"
                                            className={`${inputClass} pl-10`}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 pl-1">
                                        {identifierType === 'phone'
                                            ? '📱 Phone number detected — include country code e.g. +923001234567'
                                            : '✉️ Email address detected'}
                                    </p>

                                    {/* Continue button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}
                                    >
                                        {loading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : <>Continue <span className="text-lg">→</span></>
                                        }
                                    </button>

                                    {/* Divider */}
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                        <span className="text-gray-400 text-sm font-medium uppercase tracking-widest">or</span>
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                    </div>

                                    {/* Guest mode */}
                                    <button
                                        type="button"
                                        onClick={handleGuestMode}
                                        className="w-full py-4 px-6 bg-transparent border-2 border-[#E5E0D8] text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserCheck className="w-5 h-5" />
                                        Browse as Guest
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ════ VIEW 2a: LOGIN ════ */}
                        {view === 'LOGIN' && (
                            <motion.div
                                key="login"
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <User className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back!</h2>
                                    <p className="text-gray-500 mt-2">Enter your password to continue</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    {/* Identifier display (read-only, clickable to change) */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-[#E5E0D8]">
                                        <span className="text-gray-800 font-medium text-sm">{identifier}</span>
                                        <button
                                            type="button"
                                            onClick={() => setView('IDENTIFIER_ENTRY')}
                                            className="text-xs font-bold"
                                            style={{ color: '#FF6B35' }}
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {/* Password */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Password"
                                            className={`${inputClass} pl-10 pr-12`}
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Login button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}
                                    >
                                        {loading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : 'Login →'
                                        }
                                    </button>

                                    {/* Back */}
                                    <button
                                        type="button"
                                        onClick={() => { setView('IDENTIFIER_ENTRY'); setPassword(''); }}
                                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ════ VIEW 2b: SIGNUP ════ */}
                        {view === 'SIGNUP' && (
                            <motion.div
                                key="signup"
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <Flame className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                                    <p className="text-gray-500 mt-2">Join thousands of Foodies on SaySavor</p>
                                </div>

                                <form onSubmit={handleSignup} className="space-y-4">
                                    {/* Identifier display */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-[#E5E0D8]">
                                        <span className="text-gray-800 font-medium text-sm">{identifier}</span>
                                        <button
                                            type="button"
                                            onClick={() => setView('IDENTIFIER_ENTRY')}
                                            className="text-xs font-bold"
                                            style={{ color: '#FF6B35' }}
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {/* Name */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Your name"
                                            className={`${inputClass} pl-10`}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Create password (min 6 chars)"
                                            className={`${inputClass} pl-10 pr-12`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Confirm password */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm password"
                                            className={`${inputClass} pl-10 pr-12`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Create account button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}
                                    >
                                        {loading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : 'Create Account →'
                                        }
                                    </button>

                                    {/* Guest */}
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                        <span className="text-gray-400 text-sm">or</span>
                                        <div className="flex-1 border-t border-[#E5E0D8]" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGuestMode}
                                        className="w-full py-3 px-6 bg-transparent border-2 border-[#E5E0D8] text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <UserCheck className="w-4 h-4" /> Browse as Guest instead
                                    </button>

                                    {/* Back */}
                                    <button
                                        type="button"
                                        onClick={() => { setView('IDENTIFIER_ENTRY'); setPassword(''); setConfirmPassword(''); setName(''); }}
                                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ════ VIEW 3: OTP VERIFY ════ */}
                        {view === 'OTP_VERIFY' && (
                            <motion.div
                                key="otp"
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                                        <KeyRound className="w-8 h-8" style={{ color: '#FF6B35' }} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
                                    <p className="text-gray-500 mt-2">
                                        We sent a 6-digit code to<br />
                                        <span className="font-semibold text-gray-800">{identifier}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleOtpVerify} className="space-y-4">
                                    {/* OTP input */}
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="Enter 6-digit code"
                                        className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
                                        required
                                        autoFocus
                                        maxLength={8}
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={btnPrimary}
                                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)' }}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue →'}
                                    </button>

                                    <div className="flex items-center justify-between text-sm pt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setView('SIGNUP'); setOtp(''); }}
                                            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={loading}
                                            className="font-semibold hover:underline"
                                            style={{ color: '#FF6B35' }}
                                        >
                                            Resend Code
                                        </button>
                                    </div>

                                    <div
                                        className="flex items-start gap-3 p-4 rounded-xl mt-2"
                                        style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)' }}
                                    >
                                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF6B35' }} />
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            Code expires in <strong>24 hours</strong>. Check your spam folder if you don't see it.
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Terms footer */}
                    <p className="text-center text-xs text-gray-400 leading-relaxed px-4 pt-2">
                        By continuing, you agree to SaySavor's{' '}
                        <a href="/policies" className="underline hover:text-orange-500">Terms of Service</a>{' '}
                        and{' '}
                        <a href="/policies" className="underline hover:text-orange-500">Privacy Policy</a>.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default CustomerAuth;
