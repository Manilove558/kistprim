'use client'

import { useState } from 'react'
import { X, Mail, ShieldCheck, Loader2 } from 'lucide-react'
import {
  ADMIN_EMAIL,
  generateOtp,
  saveOtp,
  verifyOtp,
  setAdminSession,
  isValidAdminEmail,
} from '@/lib/admin-auth'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export default function AdminLogin({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [devOtp, setDevOtp] = useState('')

  const sendOtp = async () => {
    setError('')
    setInfo('')
    if (!isValidAdminEmail(email)) {
      setError(`Sirf admin email (${ADMIN_EMAIL}) se login ho sakta hai.`)
      return
    }
    setLoading(true)
    try {
      const newOtp = generateOtp()
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: newOtp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'OTP bhejne me problem hui')
        return
      }
      saveOtp(newOtp)
      setStep(2)
      if (data.sent) {
        setInfo(`${ADMIN_EMAIL} par OTP bhej diya gaya hai. 5 minute me daalein.`)
      } else {
        // Dev mode — jab tak email service configure nahi hai
        setDevOtp(data.devPreviewOtp || newOtp)
        setInfo('Email service abhi configure nahi hai, isliye OTP yahin dikh raha hai (testing ke liye).')
      }
    } catch {
      setError('Network error — phir try karein')
    } finally {
      setLoading(false)
    }
  }

  const doVerify = () => {
    setError('')
    if (otp.trim().length !== 6) {
      setError('6-digit OTP daalein')
      return
    }
    if (verifyOtp(otp)) {
      setAdminSession()
      onSuccess()
    } else {
      setError('Galat ya expire OTP. Dobara bhejein.')
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Admin login">
        <button className="admin-close" onClick={onClose} aria-label="Band karein"><X size={18} /></button>

        <div className="admin-head">
          <span className="admin-icon"><ShieldCheck size={22} /></span>
          <h3>Admin Login</h3>
          <p>Sirf admin hi photos post kar sakta hai.</p>
        </div>

        {step === 1 ? (
          <div className="admin-body">
            <label className="admin-label">Admin Email</label>
            <div className="admin-input-wrap">
              <Mail size={16} />
              <input
                type="email"
                placeholder={ADMIN_EMAIL}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
              />
            </div>
            {error && <p className="admin-error">{error}</p>}
            {info && <p className="admin-info">{info}</p>}
            <button className="admin-btn" onClick={sendOtp} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> OTP bhej rahe hain…</> : 'OTP bhejein'}
            </button>
            <p className="admin-hint">OTP <b>{ADMIN_EMAIL}</b> par jayega.</p>
          </div>
        ) : (
          <div className="admin-body">
            <label className="admin-label">6-digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="admin-input admin-otp"
            />
            {devOtp && (
              <p className="admin-dev">Dev OTP: <b>{devOtp}</b></p>
            )}
            {error && <p className="admin-error">{error}</p>}
            {info && <p className="admin-info">{info}</p>}
            <button className="admin-btn" onClick={doVerify}>Verify & Login</button>
            <button className="admin-link" onClick={() => { setStep(1); setError(''); setInfo('') }}>
              Email badlein / OTP dobara bhejein
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
