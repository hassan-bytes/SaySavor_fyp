# Supabase Setup Guide - Step by Step

## 📋 Overview
Ye guide follow kar k aap apne Supabase project me database setup kar sakte ho.

---

## 🔧 Step 1: Supabase Dashboard Open Karo

1. Browser me jao: https://supabase.com
2. Login karo
3. Apna project select karo (SaySavor ya jo bhi naam ha)

---

## 📊 Step 2: Profiles Table Banao

### Method 1: Table Editor (Easy - Visual)

1. **Left sidebar** me **"Table Editor"** pe click karo
2. **"New table"** button pe click karo
3. **Table name** likho: `profiles`
4. Neeche diye hue columns add karo:

| Column Name | Type | Default | Extra Settings |
|------------|------|---------|----------------|
| `id` | uuid | - | Primary Key, References `auth.users(id)` |
| `email` | text | - | Unique, Not Null |
| `role` | text | `'partner'` | - |
| `owner_name` | text | - | Nullable |
| `restaurant_name` | text | - | Nullable |
| `phone` | text | - | Nullable |
| `setup_complete` | boolean | `false` | Not Null |
| `created_at` | timestamptz | `now()` | - |
| `updated_at` | timestamptz | `now()` | - |

5. **Save** button pe click karo

---

### Method 2: SQL Editor (Advanced)

1. **Left sidebar** me **"SQL Editor"** pe click karo
2. **"New query"** button pe click karo
3. Ye poora query copy-paste karo:

```sql
-- Step 1: Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'partner',
  owner_name TEXT,
  restaurant_name TEXT,
  phone TEXT,
  setup_complete BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert (for trigger)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);
```

4. **RUN** button pe click karo (ya `Ctrl + Enter`)
5. Success message dekho: ✅ "Success. No rows returned"

---

## ⚡ Step 3: Auto-Create Profile Trigger Banao

**SQL Editor me naya query banao** aur ye paste karo:

```sql
-- Function banao jo profile create krega
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    owner_name, 
    restaurant_name, 
    phone,
    setup_complete
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'partner'),
    NEW.raw_user_meta_data->>'owner_name',
    NEW.raw_user_meta_data->>'restaurant_name',
    NEW.raw_user_meta_data->>'phone',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pehle se trigger ha to remove karo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Naya trigger attach karo
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
```

**RUN** button pe click karo (`Ctrl + Enter`)

---

## ✅ Step 4: Test Karo

### Option 1: Existing User Test
Agar already koi user ha to uske lie manually entry daalo:

```sql
-- Replace ye values apne actual user se
INSERT INTO public.profiles (id, email, role, setup_complete)
SELECT 
  id, 
  email, 
  'partner',
  false
FROM auth.users
WHERE email = 'your-test-email@example.com';
```

### Option 2: New User Test
1. Apne app me jao
2. Naya user register karo (any email)
3. Supabase me **Table Editor** → **profiles** table check karo
4. Naye user ki entry automatically banni chahiye ✅

---

## 📊 Step 5: Add RLS Policies for Restaurants Table

**SQL Editor** me ye query run karo:

```sql
-- Enable RLS on restaurants table
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own restaurants
CREATE POLICY "Users can view own restaurants"
  ON public.restaurants
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Allow users to insert their own restaurants  
CREATE POLICY "Users can insert own restaurants"
  ON public.restaurants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Allow users to update their own restaurants
CREATE POLICY "Users can update own restaurants"
  ON public.restaurants
  FOR UPDATE
  USING (auth.uid() = owner_id);
```

---

## 🔍 Step 6: Verify Setup

**SQL Editor** me ye query run karo check krne k lie:

```sql
-- Check profiles table
SELECT * FROM public.profiles LIMIT 5;

-- Check trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected Results:**
- Profiles table me entries dikhengi
- Trigger active hoga (1 row returned)

---

## 🎯 Common Issues & Solutions

### Issue 1: "permission denied for table auth.users"
**Solution:** Trigger function me `SECURITY DEFINER` already ha, so ye issue nahi aana chahiye. Agar aaye to function dubara banao.

### Issue 2: "duplicate key value violates unique constraint"
**Solution:** User already exist krta ha profiles table me. Manual entry delete karo:
```sql
DELETE FROM public.profiles WHERE email = 'duplicate@email.com';
```

### Issue 3: Trigger fire nahi ho raha
**Solution:** 
1. Check karo trigger exist krta ha (Step 5 ka query)
2. Function dubara create karo
3. Trigger drop aur create karo

---

## 📝 Summary Checklist

Setup complete ha ya nahi check karo:

- [ ] `profiles` table bana hua ha
- [ ] Row Level Security enabled ha
- [ ] Policies create ho gayi hain
- [ ] `handle_new_user()` function exist krta ha
- [ ] `on_auth_user_created` trigger active ha
- [ ] Test user se verify kia ha

---

## 🚀 Next Steps

Supabase setup complete hone k baad:
1. Frontend code implement karenge
2. Auth helpers banayenge  
3. Protected routes setup karenge
4. Testing karenge

**Ready? Mujhe batayen jab Supabase setup complete ho jaye!**
