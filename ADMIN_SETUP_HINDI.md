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
   - `RESEND_FROM_EMAIL` = Resend ka test sender email (ya apna verified domain)
   - `ADMIN_SECRET` = koi lambi random string (admin token sign karne ke liye — **zaroori hai**, bina iske admin login kaam nahi karega)
4. Deploy dobara karo — ab OTP sach me mail par jayega

> **Security note:** OTP ab server par banta aur verify hota hai. Login ke baad server ek signed token deta hai (12 ghante valid) — photo add/delete/edit sirf isi token se hota hai. `ADMIN_SECRET` kisi ko mat batana aur GitHub me kabhi mat daalna.

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

## Naye Features (Sep 27, 2026)

1. **Bulk upload** — Photo Post me "Photos chunein" se ek saath 50 tak photos select karo. Har photo ka title alag se badal sakte ho (default: file ka naam). Ek album + ek common detail sab par lag jayega.

2. **Albums** — Upload ya Edit me album ka naam likho (jaise "Freshers 2026"). Gallery ke upar chips ayenge — chip dabao to sirf us album ki photos dikhengi. "Sab" dabao to saari.

3. **Likes** — Har photo par dil (♥) ka button hai, students bina login ke like kar sakte hain. Dobara dabane par like hat bhi jata hai. Kitne likes hain, ye sabko dikhta hai.

4. **Backup download** — Admin mode me gallery ke upar "Backup download" button hai. Dabate hi saari uploaded photos ka ZIP download hoga (photos + unke title/album wali list). Apne laptop me sambhal kar rakho.
