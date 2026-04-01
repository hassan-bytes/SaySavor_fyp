// ============================================================
// FILE: Partner_Auth.tsx
// SECTION: 2_partner > auth > pages
// PURPOSE: Partner ka login aur signup form.
//          Supabase Auth se connected hai.
//          Google OAuth bhi support karta hai.
// ROUTE: /auth
// ============================================================
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ChefHat, Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { getUserRoles, checkPanelMismatch } from '@/shared/lib/roleHelpers';
import { RoleConfirmationDialog } from '@/shared/components/RoleConfirmationDialog';

// Top 10 Countries
const TOP_COUNTRIES = [
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', pattern: /^3[0-9]{9}$/ },
    { code: 'US', name: 'USA', dialCode: '+1', flag: '🇺🇸', pattern: /^[2-9][0-9]{9}$/ },
    { code: 'GB', name: 'UK', dialCode: '+44', flag: '🇬🇧', pattern: /^7[0-9]{9}$/ },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', pattern: /^[2-9][0-9]{9}$/ },
    { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', pattern: /^5[0-9]{8}$/ },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', pattern: /^5[0-9]{8}$/ },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', pattern: /^1[3-9][0-9]{9}$/ },
    { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', pattern: /^5[0-9]{9}$/ },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', pattern: /^1[5-7][0-9]{8,9}$/ },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', pattern: /^4[0-9]{8}$/ },
];

// Rate limiting helper
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

// Password strength validator
const validatePasswordStrength = (password: string): { isStrong: boolean; feedback: string[] } => {
    const feedback: string[] = [];
    
    if (password.length < 8) feedback.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) feedback.push('At least 1 uppercase letter');
    if (!/[a-z]/.test(password)) feedback.push('At least 1 lowercase letter');
    if (!/[0-9]/.test(password)) feedback.push('At least 1 number');
    if (!/[!@#$%^&*]/.test(password)) feedback.push('At least 1 special character (!@#$%^&*)');
    
    return {
        isStrong: feedback.length === 0,
        feedback
    };
};

// Validation Schemas
const createSignupSchema = (phonePattern: RegExp) => z.object({
    owner_name: z.string().min(2, 'Name must be at least 2 characters'),
    restaurant_name: z.string().min(2, 'Restaurant name required'),
    phone: z.string().regex(phonePattern, 'Invalid phone number for selected country'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .refine((pwd) => /[A-Z]/.test(pwd), 'Password must contain at least 1 uppercase letter')
        .refine((pwd) => /[a-z]/.test(pwd), 'Password must contain at least 1 lowercase letter')
        .refine((pwd) => /[0-9]/.test(pwd), 'Password must contain at least 1 number')
        .refine((pwd) => /[!@#$%^&*]/.test(pwd), 'Password must contain at least 1 special character'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const otpSchema = z.object({
    otp: z.string().min(6, 'OTP must be at least 6 digits').max(8, 'OTP is too long'),
});

// Password Recovery Schemas
const forgotEmailSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const recoveryOtpSchema = z.object({
    otp: z.string().min(1, 'Recovery code is required'),
});

const newPasswordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type SignupForm = z.infer<ReturnType<typeof createSignupSchema>>;
type LoginForm = z.infer<typeof loginSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type ForgotEmailForm = z.infer<typeof forgotEmailSchema>;
type RecoveryOtpForm = z.infer<typeof recoveryOtpSchema>;
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

// Premium Cinematic Dark Theme Portal
function LuxuryImagePortal() {
    return (
        <motion.div
            animate={{
                y: [0, -10, 0],
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            className="relative w-[560px] h-[315px] rounded-[30px] border border-rose-900/20 shadow-2xl overflow-hidden bg-[#0a0505]"
            style={{
                boxShadow: '0 0 50px rgba(192, 57, 43, 0.15), 0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
        >
            {/* Deep Crimson Ambient Glow */}
            <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-rose-600/10 via-transparent to-red-900/30 opacity-70 pointer-events-none z-10" />

            {/* 3D Element Container */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
                {/* Simulated 3D Element - Rich Red/Gold */}
                <motion.div
                    animate={{ rotateY: 360, rotateX: [0, 10, 0] }}
                    transition={{
                        rotateY: { duration: 30, repeat: Infinity, ease: "linear" },
                        rotateX: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative w-full h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border border-rose-500/20 blur-[1px] m-6" style={{ transform: 'translateZ(-20px)' }} />
                    {/* Middle Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-rose-500/40 m-12" style={{ transform: 'translateZ(0px)', boxShadow: 'inset 0 0 20px rgba(225,29,72,0.1)' }} />
                    {/* Core Icon */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'translateZ(30px)' }}>
                        <ChefHat className="w-24 h-24 text-rose-100 drop-shadow-[0_0_20px_rgba(225,29,72,0.6)]" strokeWidth={1.5} />
                    </div>
                </motion.div>
            </div>

            {/* Floating Slogans - Elegant & Smooth */}
            <motion.div
                animate={{ opacity: [0, 1, 0], y: [5, 0, -5] }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut" }}
                className="absolute top-8 left-8 bg-[#0b0202]/60 backdrop-blur-md px-6 py-2.5 rounded-full border border-rose-500/10 shadow-[0_4px_20px_rgba(192,57,43,0.1)] z-20"
            >
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-xs font-semibold text-rose-100/90 tracking-[0.15em] uppercase">Intelligent Growth</span>
                </div>
            </motion.div>

            <motion.div
                animate={{ opacity: [0, 1, 0], y: [-5, 0, 5] }}
                transition={{ duration: 6, delay: 3, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut" }}
                className="absolute bottom-8 right-8 bg-[#0b0202]/60 backdrop-blur-md px-6 py-2.5 rounded-full border border-rose-500/10 shadow-[0_4px_20px_rgba(192,57,43,0.1)] z-20"
            >
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-xs font-semibold text-rose-100/90 tracking-[0.15em] uppercase">Premium Analytics</span>
                </div>
            </motion.div>

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0202]/90 via-transparent to-[#0b0202]/40 pointer-events-none z-[5]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0202]/70 via-transparent to-transparent pointer-events-none z-[5]" />
        </motion.div>
    );
}



// Floating Label Input
const FloatingLabelInput = React.forwardRef<HTMLInputElement, any>(({
    id,
    label,
    type = 'text',
    error,
    autoComplete,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Check for value on mount and when props.value changes
    React.useEffect(() => {
        if (inputRef.current) {
            const hasInputValue = inputRef.current.value.length > 0 ||
                (props.value && String(props.value).length > 0);
            setHasValue(hasInputValue);
        }
    }, [props.value]);

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                id={id}
                type={type}
                autoComplete={autoComplete}
                className="peer bg-white border-[#d1c8b8] text-[#2c1e16] placeholder:text-transparent focus:border-red-800 focus:ring-1 focus:ring-red-800 transition-all h-11 autofill:bg-white shadow-sm rounded-md"
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                    setIsFocused(false);
                    setHasValue(e.target.value.length > 0);
                }}
                onChange={(e) => {
                    setHasValue(e.target.value.length > 0);
                    if (props.onChange) props.onChange(e);
                }}
                {...props}
            />
            <Label
                htmlFor={id}
                className={`absolute left-3 transition-all duration-300 pointer-events-none 
                    ${isFocused || hasValue
                        ? '-top-2.5 text-xs bg-white px-1 text-red-800 font-medium'
                        : 'top-2.5 text-sm text-[#8a7b6c]'
                    } 
                    peer-autofill:-top-2.5 peer-autofill:text-xs peer-autofill:bg-white peer-autofill:px-1 peer-autofill:text-red-800 peer-autofill:font-medium`}
            >
                {label}
            </Label>
            {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
        </div>
    );
});

FloatingLabelInput.displayName = 'FloatingLabelInput';

// Custom Country Dropdown
function CountryDropdown({ selected, onSelect }: any) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-11 px-3 bg-white border border-[#d1c8b8] rounded-md text-[#2c1e16] hover:border-red-800 transition-all shadow-sm focus:outline-none focus:border-red-800 focus:ring-1 focus:ring-red-800"
            >
                <span className="text-lg">{selected.flag}</span>
                <span className="text-sm font-medium">{selected.dialCode}</span>
                <ChevronDown className="w-4 h-4 text-[#8a7b6c]" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-48 overflow-y-auto bg-white border border-[#d1c8b8] rounded-lg shadow-xl">
                    {TOP_COUNTRIES.map((country) => (
                        <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                                onSelect(country);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-[#2c1e16] hover:bg-[#f8f5f0] transition-colors"
                        >
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-sm flex-1 font-medium">{country.name}</span>
                            <span className="text-xs text-[#8a7b6c]">{country.dialCode}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const Partner_Auth = () => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isOtpSent, setIsOtpSent] = useState(false);
    // Added EMAIL_ENTRY to the start of the flow
    const [authView, setAuthView] = useState<'EMAIL_ENTRY' | 'LOGIN' | 'SIGNUP' | 'FORGOT_EMAIL' | 'FORGOT_OTP' | 'FORGOT_NEWPASS'>('EMAIL_ENTRY');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(TOP_COUNTRIES[0]);
    const [email, setEmail] = useState('');
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [showRoleConfirmation, setShowRoleConfirmation] = useState(false);
    const [roleWarningType, setRoleWarningType] = useState<'partner_in_customer' | 'customer_in_partner' | null>(null);
    const [roleWarningMessage, setRoleWarningMessage] = useState('');

    const navigate = useNavigate();

    // Check if user is already logged in on component mount
    React.useEffect(() => {
        checkIfLoggedIn();
    }, []);

    const checkIfLoggedIn = async () => {
        try {
            const { getUserStatus } = await import('@/shared/lib/authHelpers');
            const status = await getUserStatus();

            // If user is already authenticated, redirect them
            if (status.isAuthenticated) {
                navigate(status.redirectTo, { replace: true });
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            console.error('Auth check error:', error);
            // If there's an error, just stay on the auth page
        }
    };


    const signupSchema = useMemo(
        () => createSignupSchema(selectedCountry.pattern),
        [selectedCountry]
    );

    const signupForm = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
    });

    // Email Check Form for EMAIL_ENTRY view
    const emailCheckForm = useForm<{ email: string }>({
        resolver: zodResolver(z.object({
            email: z.string().email('Invalid email address')
        })),
    });

    const loginForm = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const otpForm = useForm<OtpForm>({
        resolver: zodResolver(otpSchema),
    });

    const forgotEmailForm = useForm<ForgotEmailForm>({
        resolver: zodResolver(forgotEmailSchema),
    });

    const recoveryOtpForm = useForm<RecoveryOtpForm>({
        resolver: zodResolver(recoveryOtpSchema),
    });

    const newPasswordForm = useForm<NewPasswordForm>({
        resolver: zodResolver(newPasswordSchema),
    });

    // Smart Email Check Handler with Role Detection
    const handleEmailCheck = async (data: { email: string }) => {
        setLoading(true);
        setEmail(data.email);

        try {
            // Check if user exists using Secure RPC
            const { data: userExists, error } = await (supabase as any)
                .rpc('check_user_exists', { email_check: data.email });

            if (error) {
                // Ignore abort errors - happens if user navigates away
                if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
                
                console.error('Profile check error:', error);
                // On error, default to signup
                setAuthView('SIGNUP');
                setMode('signup');
                signupForm.setValue('email', data.email);
                setLoading(false);
                return;
            }

            if (userExists) {
                // User exists - check their roles
                const userRoles = await getUserRoles(data.email);
                const mismatch = checkPanelMismatch(userRoles, 'partner');

                if (mismatch.shouldWarn && mismatch.warningType === 'customer_in_partner') {
                    // Customer trying to use partner panel - show confirmation
                    setRoleWarningType(mismatch.warningType);
                    setRoleWarningMessage(mismatch.message);
                    setShowRoleConfirmation(true);
                    setLoading(false);
                    return;
                }

                // User exists and has partner role (or confirmed) -> Show LOGIN
                toast.info('Welcome back! Please login.');
                setAuthView('LOGIN');
                setMode('login');
                loginForm.setValue('email', data.email);
            } else {
                // New user (verified) -> Show SIGNUP
                toast.info('New user detected! Please create your account.');
                setAuthView('SIGNUP');
                setMode('signup');
                signupForm.setValue('email', data.email);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            console.error('Email check failed:', error);
            toast.error('Failed to verify email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle role confirmation (allow continue in partner panel)
    const handleRoleConfirmation = async () => {
        setShowRoleConfirmation(false);
        setAuthView('LOGIN');
        setMode('login');
        loginForm.setValue('email', email);
        toast.info('Continue with password to proceed in Partner panel.');
    };

    const handleSignup = async (data: SignupForm) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        // Standardized metadata for Saysavor 2.0 Schema
                        full_name: data.owner_name,
                        restaurant_name: data.restaurant_name,
                        role: 'partner',
                        phone: `${selectedCountry.dialCode}${data.phone}`,
                        onboarding_completed: false,
                        subscription_status: 'trial',
                        is_active: true
                    },
                },
            });

            if (error) {
                console.error('Signup Error Details:', error);
                // Smart Error Handling - Check for duplicate user
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('already registered') ||
                    errorMsg.includes('unique') ||
                    errorMsg.includes('exists') ||
                    errorMsg.includes('duplicate')) {

                    toast.error('⚠️ User already exists! Switching to Login...');

                    // Auto-switch to login view
                    setTimeout(() => {
                        setMode('login');
                        setAuthView('LOGIN');
                        loginForm.setValue('email', data.email);
                    }, 1500);
                } else {
                    toast.error(error.message);
                }
            } else {
                setEmail(data.email);
                setIsOtpSent(true);
                toast.success('Verification email sent! Check your inbox.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerification = async (data: OtpForm) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: data.otp,
                type: 'signup',
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Email verified! Setting up your account...');

                // Profile-based navigation
                const { getUserStatus } = await import('@/shared/lib/authHelpers');
                const status = await getUserStatus();

                navigate(status.redirectTo);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (data: LoginForm) => {
        // Check rate limiting
        if (authRateLimiter.isLimited(data.email)) {
            toast.error('Too many login attempts. Please try again in 5 minutes.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                authRateLimiter.reset(data.email);
                toast.success('Login successful!');

                // Smart Navigation based on setup status
                const { getUserStatus } = await import('@/shared/lib/authHelpers');
                const status = await getUserStatus();

                if (!status.setupComplete) {
                    toast.info('Please complete your restaurant setup!');
                }

                navigate(status.redirectTo);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Password Recovery Handlers
    const sendResetOtp = async (data: ForgotEmailForm) => {
        setLoading(true);
        try {
            // First, check if user with this email exists
            // First, check if user with this email exists using Secure RPC
            const { data: userExists, error: checkError } = await (supabase as any)
                .rpc('check_user_exists', { email_check: data.email });

            if (checkError) {
                console.error('Email check failed:', checkError);
                toast.error('Unable to verify email address');
                setLoading(false);
                return;
            }

            // If no user found with this email
            if (!userExists) {
                toast.error('No account found with this email address');
                setLoading(false);
                return;
            }

            // User exists, send recovery email
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/auth`,
            });

            if (error) {
                toast.error(error.message);
            } else {
                setRecoveryEmail(data.email);
                setAuthView('FORGOT_OTP');
                toast.success('Recovery code sent to your email!');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyResetOtp = async (data: RecoveryOtpForm) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: recoveryEmail,
                token: data.otp,
                type: 'recovery',
            });

            if (error) {
                toast.error(error.message);
            } else {
                setAuthView('FORGOT_NEWPASS');
                toast.success('Code verified! Set your new password.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateUserPassword = async (data: NewPasswordForm) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Password updated successfully!');
                setAuthView('LOGIN');
                setMode('login');
                newPasswordForm.reset();
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isLogin = mode === 'login';

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#e0d6c8]">
            {/* LEFT PANEL - Premium Cinematic Dark Theme (Matching Partner Page) */}
            <div className="hidden md:flex relative w-1/2 h-full overflow-hidden" style={{ background: '#0b0202' }}>
                {/* Deep Background Gradient */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,2,2,0) 0%, rgba(24,5,5,1) 100%)', zIndex: 0 }} />

                {/* Ambient Glow Spot (Soft Rose/Crimson) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[100px] opacity-60 z-0" style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.15) 0%, transparent 70%)' }} />

                {/* Subtle Grid Overlay for Tech Vibe */}
                <div className="absolute inset-0 bg-[url('/texture/grid.svg')] opacity-[0.02] z-[1]" />

                {/* Center Stage Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-8 px-12">
                    {/* Premium 3D Text Reveal */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="text-center space-y-6"
                    >
                        {/* Main Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                            className="text-3xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg"
                        >
                            Elevate <br /> <span className="text-rose-400 font-black tracking-normal">Your Reach.</span>
                        </motion.h1>

                        {/* Decorative Crimson Line */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "120px", opacity: 1 }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                            className="h-[2px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent mx-auto"
                        />

                        {/* Subtext - Elegant Reveal */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}
                            className="text-sm uppercase tracking-[0.25em] text-zinc-400 font-medium"
                        >
                            The Future of Dining
                        </motion.p>
                    </motion.div>

                    {/* Floating Crimson 3D Portal */}
                    <LuxuryImagePortal />

                    {/* Bottom Tagline */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                        className="text-zinc-500 text-sm text-center font-medium max-w-sm tracking-wide"
                    >
                        Partner with SaySavor to transform your business with AI.
                    </motion.p>
                </div>
            </div>

            {/* RIGHT PANEL - Form Container Light Theme */}
            <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#faf8f5]/80 backdrop-blur-xl border-l border-[#d1c8b8]">
                <div className="flex flex-col justify-center items-center min-h-full py-12 px-6">
                    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#f0eadd]">
                        {/* Logo */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isOtpSent ? 'otp-logo' : authView !== 'LOGIN' ? authView : mode}
                                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="flex justify-center mb-6"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 border border-red-800/30 shadow-lg shadow-red-900/20">
                                    <ChefHat className="w-8 h-8 text-white" />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Form Header */}
                        <h2 className="text-2xl font-black text-center text-[#2c1e16] mb-2 tracking-tight">
                            {isOtpSent
                                ? 'Verify Email'
                                : authView === 'EMAIL_ENTRY'
                                    ? 'Welcome'
                                    : authView === 'FORGOT_EMAIL'
                                        ? 'Reset Password'
                                        : authView === 'FORGOT_OTP'
                                            ? 'Verify Recovery Code'
                                            : authView === 'FORGOT_NEWPASS'
                                                ? 'Set New Password'
                                                : isLogin
                                                    ? 'Welcome Back'
                                                    : 'Create Account'}
                        </h2>
                        <p className="text-center text-[#8a7b6c] text-sm mb-8 font-medium">
                            {isOtpSent
                                ? 'Enter the 6-8 digit code sent to your email'
                                : authView === 'EMAIL_ENTRY'
                                    ? 'Enter your email to continue'
                                    : authView === 'FORGOT_EMAIL'
                                        ? 'Enter your email to receive a recovery code'
                                        : authView === 'FORGOT_OTP'
                                            ? 'Check your email for the recovery code'
                                            : authView === 'FORGOT_NEWPASS'
                                                ? 'Create a strong password for your account'
                                                : isLogin
                                                    ? 'Enter your password to access dashboard'
                                                    : 'Complete your profile to join us'}
                        </p>


                        <AnimatePresence mode="wait">
                            {/* OTP FORM */}
                            {isOtpSent ? (
                                <motion.form
                                    key="otp"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={otpForm.handleSubmit(handleOtpVerification)}
                                    className="space-y-4"
                                >
                                    <FloatingLabelInput
                                        id="otp"
                                        label="OTP Code (6-8 digits)"
                                        autoComplete="one-time-code"
                                        {...otpForm.register('otp')}
                                        error={otpForm.formState.errors.otp?.message}
                                        maxLength={8}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setIsOtpSent(false)}
                                        className="flex items-center gap-2 text-[#8a7b6c] hover:text-red-800 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                </motion.form>
                            ) : authView === 'EMAIL_ENTRY' ? (
                                /* EMAIL CHECK FORM */
                                <motion.form
                                    key="email-check"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={emailCheckForm.handleSubmit(handleEmailCheck)}
                                    className="space-y-4"
                                >
                                    <FloatingLabelInput
                                        id="check-email"
                                        label="Email Address"
                                        type="email"
                                        autoComplete="email"
                                        {...emailCheckForm.register('email')}
                                        error={emailCheckForm.formState.errors.email?.message}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
                                    </Button>
                                </motion.form>
                            ) : isLogin && authView === 'LOGIN' ? (
                                /* LOGIN FORM */
                                <motion.form
                                    key="login"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={loginForm.handleSubmit(handleLogin)}
                                    className="space-y-4"
                                >
                                    {/* Email display */}
                                    <div className="flex items-center justify-between p-3 bg-[#f8f5f0] rounded-md border border-[#d1c8b8]">
                                        <span className="text-[#2c1e16] text-sm font-medium">{email}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAuthView('EMAIL_ENTRY')}
                                            className="text-xs text-red-600 hover:text-red-800 font-bold"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <input type="hidden" {...loginForm.register('email')} />

                                    <div className="relative">
                                        <FloatingLabelInput
                                            id="login-password"
                                            label="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            {...loginForm.register('password')}
                                            error={loginForm.formState.errors.password?.message}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-[#8a7b6c] hover:text-red-800"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Forgot Password Link */}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setAuthView('FORGOT_EMAIL')}
                                            className="text-xs text-[#8a7b6c] hover:text-red-800 transition-colors font-medium"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                                    </Button>
                                </motion.form>

                            ) : authView === 'FORGOT_EMAIL' ? (
                                /* FORGOT PASSWORD - EMAIL REQUEST */
                                <motion.form
                                    key="forgot-email"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={forgotEmailForm.handleSubmit(sendResetOtp)}
                                    className="space-y-4"
                                >
                                    <FloatingLabelInput
                                        id="forgot-email"
                                        label="Email"
                                        type="email"
                                        autoComplete="email"
                                        {...forgotEmailForm.register('email')}
                                        error={forgotEmailForm.formState.errors.email?.message}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Code'}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setAuthView('LOGIN')}
                                        className="flex items-center gap-2 text-[#8a7b6c] hover:text-red-800 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Login
                                    </button>
                                </motion.form>
                            ) : authView === 'FORGOT_OTP' ? (
                                /* FORGOT PASSWORD - OTP VERIFICATION */
                                <motion.form
                                    key="forgot-otp"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={recoveryOtpForm.handleSubmit(verifyResetOtp)}
                                    className="space-y-4"
                                >
                                    <FloatingLabelInput
                                        id="recovery-otp"
                                        label="Recovery Code"
                                        autoComplete="one-time-code"
                                        {...recoveryOtpForm.register('otp')}
                                        error={recoveryOtpForm.formState.errors.otp?.message}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setAuthView('LOGIN')}
                                        className="flex items-center gap-2 text-[#8a7b6c] hover:text-red-800 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Login
                                    </button>
                                </motion.form>
                            ) : authView === 'FORGOT_NEWPASS' ? (
                                /* FORGOT PASSWORD - NEW PASSWORD */
                                <motion.form
                                    key="forgot-newpass"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={newPasswordForm.handleSubmit(updateUserPassword)}
                                    className="space-y-4"
                                >
                                    <div className="relative">
                                        <FloatingLabelInput
                                            id="new-password"
                                            label="New Password"
                                            type={showNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            {...newPasswordForm.register('password')}
                                            error={newPasswordForm.formState.errors.password?.message}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-2.5 text-[#8a7b6c] hover:text-red-800"
                                        >
                                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <FloatingLabelInput
                                            id="confirm-new-password"
                                            label="Confirm New Password"
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            {...newPasswordForm.register('confirmPassword')}
                                            error={newPasswordForm.formState.errors.confirmPassword?.message}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                            className="absolute right-3 top-2.5 text-[#8a7b6c] hover:text-red-800"
                                        >
                                            {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Set New Password'}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setAuthView('LOGIN')}
                                        className="flex items-center gap-2 text-[#8a7b6c] hover:text-red-800 transition-colors mx-auto text-sm font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Login
                                    </button>
                                </motion.form>
                            ) : authView === 'SIGNUP' ? (
                                /* SIGNUP FORM */
                                <motion.form
                                    key="signup"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    onSubmit={signupForm.handleSubmit(handleSignup)}
                                    className="space-y-3"
                                >
                                    {/* Email display (Read only or switch back) */}
                                    <div className="flex items-center justify-between p-3 bg-[#f8f5f0] rounded-md border border-[#d1c8b8] mb-4">
                                        <span className="text-[#2c1e16] text-sm font-medium">{email}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAuthView('EMAIL_ENTRY')}
                                            className="text-xs text-red-600 hover:text-red-800 font-bold"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <input type="hidden" {...signupForm.register('email')} />
                                    {/* Row 1: Names (Grid) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <FloatingLabelInput
                                            id="owner_name"
                                            label="Your Name"
                                            autoComplete="name"
                                            {...signupForm.register('owner_name')}
                                            error={signupForm.formState.errors.owner_name?.message}
                                        />
                                        <FloatingLabelInput
                                            id="restaurant_name"
                                            label="Restaurant Name"
                                            autoComplete="organization"
                                            {...signupForm.register('restaurant_name')}
                                            error={signupForm.formState.errors.restaurant_name?.message}
                                        />
                                    </div>

                                    {/* Row 2: Phone */}
                                    <div>
                                        <Label htmlFor="phone" className="text-xs text-gray-400 mb-1.5 block">Phone Number</Label>
                                        <div className="flex gap-2">
                                            <CountryDropdown selected={selectedCountry} onSelect={setSelectedCountry} />
                                            <FloatingLabelInput
                                                id="phone"
                                                label="Phone Number"
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel-national"
                                                {...signupForm.register('phone')}
                                                error={signupForm.formState.errors.phone?.message}
                                            />
                                        </div>
                                    </div>



                                    {/* Row 4: Password */}
                                    <div className="relative">
                                        <FloatingLabelInput
                                            id="password"
                                            label="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            {...signupForm.register('password')}
                                            error={signupForm.formState.errors.password?.message}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-[#8a7b6c] hover:text-red-800"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Row 5: Confirm Password */}
                                    <div className="relative">
                                        <FloatingLabelInput
                                            id="confirmPassword"
                                            label="Confirm Password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            {...signupForm.register('confirmPassword')}
                                            error={signupForm.formState.errors.confirmPassword?.message}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-2.5 text-[#8a7b6c] hover:text-red-800"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-white shadow-lg shadow-red-900/20 transition-all font-bold"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                                    </Button>

                                    <p className="text-center text-[#8a7b6c] text-sm mt-4">
                                        Wrong email?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setAuthView('EMAIL_ENTRY')}
                                            className="text-red-700 hover:text-red-900 font-bold hover:underline transition-all"
                                        >
                                            Start Over
                                        </button>
                                    </p>
                                    <p className="text-center text-[#8a7b6c] text-sm mt-2">
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthView('LOGIN'); // Switch to Login view
                                                setMode('login');
                                            }}
                                            className="text-red-700 hover:text-red-900 font-bold hover:underline transition-all"
                                        >
                                            Login
                                        </button>
                                    </p>
                                </motion.form>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Role Confirmation Dialog */}
            <RoleConfirmationDialog
                isOpen={showRoleConfirmation}
                onClose={() => {
                    setShowRoleConfirmation(false);
                    setAuthView('EMAIL_ENTRY');
                }}
                onConfirm={handleRoleConfirmation}
                warningType={roleWarningType}
                message={roleWarningMessage}
                loading={loading}
            />
        </div>
    );
};

export default Partner_Auth;
