# Admin Setup — Hindi Guide

## Kya banaya gaya hai

1. **Sirf Admin photo post kar sakta hai**
   - Nav me "Admin Login" button hai
   - Login ke baad "Photo Post" + "Logout" dikhega
   - Hero me bhi "Nayi Photo Post karein" button ayega
   - Admin mode me har photo par delete button dikhega

2. **Admin Login — Email + OTP**
   - Sirf `backc6915@gmail.com` se login hoga
   - Email dalne par usi mail par 6-digit OTP jayega
   - OTP 5 minute valid hai
   - Koi aur email dalega to error: "Sirf admin email se login ho sakta hai"

## OTP Email kaise bhejein (zaroori step)

Abhi code **dev mode** me hai — OTP screen par hi dikh jayega jab tak email service configure nahi hoti.

Asli me `backc6915@gmail.com` par OTP bhejne ke liye:

### Option A: Resend (sabse aasan, free)
1. https://resend.com par jao, free account banao
2. API Keys me nayi key banao
3. Netlify / Vercel me Environment Variables me add karo:
   - `RESEND_API_KEY` = tumhari key
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (ya apna verified domain)
4. Deploy dobara karo — ab OTP sach me mail par jayega

### Option B: Bina service (testing)
- `.env` mat lagao — OTP login modal me "Dev OTP" ke roop me dikhega
- Ye sirf testing ke liye hai

## Kaise chalayein

```bash
cd kistprim-admin
npm install
npm run dev
```

Deploy: `npm run build`

## Files jo badli gayin
- `lib/admin-auth.ts` — admin email + OTP logic
- `app/api/send-otp/route.ts` — OTP bhejne wali API
- `components/admin/AdminLogin.tsx` — login modal
- `components/admin/AdminUpload.tsx` — photo post modal
- `app/page.tsx` — admin buttons + gallery logic
- `app/globals.css` — admin styles
