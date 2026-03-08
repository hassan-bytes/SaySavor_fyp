# 🔐 Supabase OTP Configuration Guide

## Problem
Supabase currently sends **Magic Links** for verification instead of **OTP codes** (6-8 digits).

## Solution
Aapko Supabase Dashboard mein Email Templates configure karni hain.

---

## 📋 Step-by-Step Instructions

### 1. Supabase Dashboard mein jayen
1. Apna project open karein
2. Left sidebar se **Authentication** tab kholein
3. **Email Templates** pe click karein

### 2. Signup Confirmation Template
**Template:** `Confirm signup`

**Action:**
- **Enable email confirmations:** ✅ ON (Check karein)
- Scroll down to **Email template**

**Replace the entire template with:**

```html
<h2>Welcome to SaySavor!</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; font-weight: bold;">{{ .Token }}</h1>
<p>Enter this code in the app to verify your email.</p>
<p>This code expires in 24 hours.</p>
```

**Click Save** ✅

### 3. Magic Link Settings (DISABLE karein)
1. **Authentication** tab mein raho
2. **Providers** section kholein
3. **Email** provider pe click karein
4. **Confirm email** setting:
   - ✅ Enable if you want email verification (keep ON)
   - ❌ **Disable "Secure email change"** (Yahan pe "Enable email confirmations" ko ON rakho but "Secure password change" ya extra magic link features ko OFF karo)

### 4. Password Recovery Template
**Template:** `Reset Password`

**Replace with:**

```html
<h2>Reset Your Password</h2>
<p>You requested a password reset for your SaySavor account.</p>
<p>Your recovery code is:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; font-weight: bold;">{{ .Token }}</h1>
<p>Enter this code in the app to reset your password.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>This code expires in 1 hour.</p>
```

**Click Save** ✅

---

## ✅ Frontend Status (Already Configured)

Aapke [`Partner_Auth.tsx`](file:///e:/semester%207/saysavor-web/saysavor-golden-voice-main/src/pages/Partner/Partner_Auth.tsx) mein OTP flow pehle se ready hai:

### Signup Flow
1. User email/password enter karta hai
2. **Supabase sends OTP** (6-8 digit)
3. User OTP form mein code enter karta hai
4. `handleOtpVerification()` verify karta hai

### Password Reset Flow
1. User email enter karta hai
2. **System checks:** User exist karta hai? (Line 442-457)
3. Agar **YES** → OTP send hota hai
4. Agar **NO** → Error: "No account found"
5. User OTP enter karta hai
6. User new password set karta hai

---

## 🚀 Test Kaise Karein

1. **Supabase settings save karne ke baad:**
   - App mein naya signup karein
   - Email check karein → OTP code aana chahiye (Magic Link nahi)

2. **Password Reset:**
   - Forgot Password click karein
   - Purana email dalein → OTP aayega
   - Naya email dalein → Error aayega

---

**Bas itna hi!** Email templates save karne ke baad, Supabase automatically OTP codes bhejega. 🎯
