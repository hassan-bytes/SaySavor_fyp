# 📋 Saysavor 2.0: Menu Strategy & Validation Plan

## 🔍 Overview
Aapne jo **Master Schema** provide kiya hai wo solid hai. Lekin, "Built-in Menus" (jo `public/cuisines` folder mein hain) aur "Custom Dishes" (jo user khud add karega) ko mix karna ek tricky part hai.

Ye raha detailed breakdown ke hum isay kaise handle karenge taake **System Crash-Proof** rahe aur **Design Premium** lage.

---

## 🏗️ The Challenge: Hybrid Data
Humaare paas 2 tarah ka data hai:

1.  **Static (Built-in):**
    *   **Source:** Code (`MENU_PRESETS` json) + Local Files (`public/cuisines/...`).
    *   **Images:** Relative Paths (e.g., `/cuisines/Fast Food/Burgers/Zinger.jpg`).
    *   **Pros:** Fast loading, high quality, free (no storage cost).

2.  **Dynamic (User Custom):**
    *   **Source:** User Form Input.
    *   **Images:** Raw Files (User upload karega).
    *   **Storage:** Supabase Storage (Bucket).

---

## 💡 The Solution: "Ingestion Strategy"

Database (`menu_items` table) ko ye nahi pata hona chahiye ke item kahan se aaya. Usko bas data chahiye. Hum **Frontend (RestaurantSetup.tsx)** mein ek "Smart Transformer" lagayenge.

### 1. Database Schema Match (Validated ✅)
Jo schema aapne diya, wo is Hybrid Approach ke liye perfect hai:

```sql
CREATE TABLE public.menu_items (
  ...
  image_url text, -- Can be "/cuisines/..." OR "https://supabase..."
  is_custom boolean DEFAULT false, -- Pehchanne ke liye (Optional but recommended)
  ...
);
```

### 2. The Logic Flow (Jab User "Save" Click karega)

Jab Partner "Setup Complete" click karega, hum background mein ye process chalayenge:

#### Case A: Built-in Item Selected (e.g., Zinger Burger)
1.  Frontend se data uthao: Name, Price, Description.
2.  **Image Handling:** Image upload **MAT** karo. Bus uska path (`/cuisines/Fast Food/...`) database mein save karo.
3.  **Result:** Fast save, zero upload time.

#### Case B: Custom Item Added (e.g., Special Secret Pasta)
1.  Frontend se data uthao.
2.  **Image Handling:**
    *   Check karo file majood hai?
    *   File ko `menu-images` bucket mein upload karo.
    *   Wahan se Public URL (`https://...`) lo.
3.  **Result:** Database mein Public URL save hoga.

---

## 🎨 Recommendations (Validation Report)

Aapke Schema aur Project Report ko analyze karne ke baad, ye meri 3 suggestions hain:

### 1. "Category" ko Relational Rakhein (Implemented ✅)
Aapke naye schema mein `categories` ki alag table hai. Ye bohot zaroori hai.
*   **Kyun?** Agar `public/cuisines` mein "Fast Food" hai, par user usay "Western Food" kehna chahta hai, to wo Category table mein rename kar sakta hai bina dishes delete kiye.
*   *Maine code mein ye logic daal diya hai ke Built-in categories (Fast Food) automatically `categories` table mein insert ho jayen.*

### 2. "Slug" for SEO (Adding Now)
Aapne schema mein `slug` add kiya hai (`saysavor-golden-voice`).
*   **Suggestion:** Jab hum built-in menu import karein, to Dishes ke naam ka bhi slug bana lein (future food ordering ke liye).
    *   e.g., `.../restaurant/details?dish=zinger-burger`

### 3. Handle "Price" Changes in Built-in Items
User aksar built-in items ki price change karna chahega (e.g., Zinger $5 nahi $6 ka hai).
*   **Approach:** Hum built-in item ko "Copy" kar rahe hain database mein.
*   **Fayda:** Ek baar save honay ke baad, wo item us Restaurant ki **Private Property** ban jata hai. Agar hum future mein GLOBAL built-in price badhayen, to Partner ki set ki hui price change nahi hogi. (Isolation Success).

---

## ✅ Action Plan Summary

| Feature | Built-in Menu | Custom Dish |
| :--- | :--- | :--- |
| **Image Source** | `/public/cuisines/...` | Supabase Storage URL |
| **Insertion Time** | Instant (Text only) | Slower (Image Upload required) |
| **Data Owner** | System (initially) -> Partner (after save) | Partner |
| **Storage Cost** | Zero 🟢 | Standard 🟡 |

**Next Step:**
Maine `RestaurantSetup.tsx` mein ye logic set kar diya hai. Ab jab aap Naya Database connect karke `npm run dev` karenge, to ye system automatically detect karega ke image local hai ya upload karni hai.

## 🔄 Lifecycle Logic (User Feedback Integrated)

User ki requirement ke mutabiq, hum "Skip" aur "Dashboard" ka flow aise rakhenge:

### 1. The "Skip" Logic
Agar user Wizard mein menu select nahi karna chahta aur **"Skip for Now"** click karta hai:
*   **Action:** Hum sirf Restaurant banayenge. `menu_items` table **Empty** rahegi.
*   **Redirect:** User seedha **Dashboard** par jayega.
*   **Status:** `setup_complete` = `true`.

### 2. Dashboard "Menu Manager" (The Hybrid View)
Dashboard ke andar "Menu" section ab 2 hisson mein hoga:
*   **My Menu (Database):** Jo items user ne add kiye hain (shuru mein empty agar skip kiya).
*   **SaySavor Catalog (Built-in Library):** Wo **Full Menu** jo humare paas code mein hai via `MENU_PRESETS`. 
    *   User kabhi bhi "Catalog" tab par click karke wahan se dishes "One-Click Add" kar sakta hai.
    *   *Result:* User ko Wizard mein pressure nahi hoga. Wo Dashboard se aaram se menu bana sakta hai.

### 3. "Finish" Logic
*   **Action:** Selected items Database mein save honge.
*   **Redirect:** Dashboard par jayega.
*   **View:** "My Menu" mein selected items dikhenge, aur "Catalog" option abhi bhi available hoga naye items ke liye.

**Kya hum ab isay Finalize samjhein?** 🚀