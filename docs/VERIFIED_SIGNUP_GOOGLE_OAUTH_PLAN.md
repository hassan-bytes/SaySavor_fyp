# 🔐 Verified Signup & Google OAuth Implementation Plan

## 🎯 Objectives

1. **Delayed Profile Creation:** User ka profile aur restaurant **sirf tab** bane jab wo OTP verify kar le
2. **Google OAuth:** "Sign in with Google" option add karna

---

## 📋 Part 1: OTP-Verified Signup

### Current Problem
Abhi jo trigger hai (`handle_new_user`), wo **signup ke saath hi** profile banata hai, chahe user ne email verify kia ho ya nahi.

### Solution: Trigger Ko Smart Banao

**Strategy:** Trigger ko modify karein taake wo sirf **verified users** ke liye data create kare.

#### Updated Trigger Logic

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  is_partner boolean;
BEGIN
  -- 🛡️ CRITICAL CHECK: Only proceed if email is verified
  -- For OAuth users (Google), email_confirmed_at is auto-set
  -- For email/password users, it's set after OTP verification
  IF NEW.email_confirmed_at IS NULL THEN
    RAISE NOTICE 'Skipping profile creation - email not verified yet';
    RETURN NEW;
  END IF;

  -- Check if profile already exists (prevent duplicates)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Determine role
  is_partner := (COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'partner');

  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role,
    NEW.raw_user_meta_data->>'phone'
  );

  -- 2. Create Restaurant (Only for Partners)
  IF is_partner THEN
    INSERT INTO public.restaurants (owner_id, name, is_open)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My New Restaurant'), 
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Signup Trigger Error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to fire on BOTH insert AND update
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE PROCEDURE public.handle_new_user();
```

**Kya Hoga:**
- User signup karta hai → Trigger **SKIP** hota hai (Email unverified)
- User OTP enter karta hai → Supabase `email_confirmed_at` set karta hai → **Trigger FIRE** hota hai → Profile + Restaurant bante hain
- Google Login → Email already verified → Trigger turant fire hota hai

---

## 📋 Part 2: Google OAuth Integration

### Step 1: Supabase Dashboard Configuration

1. **Authentication → Providers** mein jao
2. **Google** provider enable karo
3. **Client ID** aur **Client Secret** chahiye (Google Cloud Console se)

#### Google Cloud Console Setup:
1. [Google Cloud Console](https://console.cloud.google.com) par jao
2. **New Project** banao (ya existing select karo)
3. **APIs & Services → Credentials** par jao
4. **Create Credentials → OAuth 2.0 Client ID**
5. **Application Type:** Web application
6. **Authorized redirect URIs** add karo:
   ```
   https://[your-supabase-project-ref].supabase.co/auth/v1/callback
   ```
7. **Client ID** aur **Client Secret** copy karo
8. Supabase mein paste karo

### Step 2: Frontend Implementation

#### Update `Partner_Auth.tsx`

**Add Google Button:**

```tsx
// Add this function
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      toast.error(error.message);
    }
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};
```

**Add Button in UI (After email/password form):**

```tsx
{/* Divider */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-white/10"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-2 bg-[#0a0a0a] text-gray-400">Or continue with</span>
  </div>
</div>

{/* Google Button */}
<Button
  type="button"
  onClick={handleGoogleSignIn}
  disabled={loading}
  className="w-full h-11 bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  {loading ? <Loader2 className="animate-spin" /> : 'Sign in with Google'}
</Button>
```

---

## ✅ Testing Checklist

### OTP Verification Test
- [ ] Naya signup karo → Check Supabase `auth.users` table → `email_confirmed_at` NULL hona chahiye
- [ ] OTP verify karo → Check `profiles` table → Profile ab banna chahiye
- [ ] Check `restaurants` table → Restaurant bhi banna chahiye

### Google OAuth Test
- [ ] "Sign in with Google" button click karo
- [ ] Google account select karo
- [ ] Redirect hone ke baad check karo: Profile aur Restaurant ban gaye?

---

## 🚀 Implementation Steps

1. **Update SQL Trigger** (Supabase SQL Editor mein run karo)
2. **Configure Google OAuth** (Supabase + Google Cloud Console)
3. **Frontend Update** (`Partner_Auth.tsx` mein Google button add karo)
4. **Test** (Dono flows verify karo)

**Ready to proceed?** 🎯
