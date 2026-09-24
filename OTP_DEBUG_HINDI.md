# OTP nahi aa raha? — Checklist

## 1. Netlify me API Key lagi hai?
`.env.local` sirf tumhare laptop par kaam karta hai. Netlify par alag se lagana padta hai:
- Netlify dashboard → tumhari site → **Site settings → Environment variables**
- Add: `RESEND_API_KEY` = tumhari `re_` wali key (nayi wali, purani delete kar di thi)
- Add: `RESEND_FROM_EMAIL` = Resend ka test sender email
- Uske baad **Deploys → Trigger deploy → Deploy site** (env var ke baad redeploy zaroori hai)

## 2. Resend account kis email se bana hai?
Resend ke test sender se mail **sirf usi email par jata hai** jis se Resend account banaya hai.
- Agar Resend account `backc6915@gmail.com` se bana hai → OTP ayega ✅
- Agar kisi aur email se bana hai → OTP nahi ayega ❌
- Solution: ya to `backc6915@gmail.com` se naya Resend account banao, ya Resend me **Domains** me apna domain verify karo

## 3. Resend dashboard me check karo
- resend.com → **Emails** (ya Logs) me jao
- Wahan dikhega mail bheja gaya ya fail hua, aur fail hone ki wajah

## 4. Spam folder
Kabhi-kabhi OTP spam/promotions me chala jata hai — wahan bhi dekho.

## 5. Local me test
Laptop par `npm run dev` chal raha hai, `.env.local` me sahi key hai, aur dev server restart kiya hai?
- Terminal me `npm run dev` ke baad Admin Login try karo
- Agar key sahi hai to OTP mail par ayega, warna popup me "Dev OTP" dikhega
