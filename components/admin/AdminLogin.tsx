'use client'

import { useState } from 'react'
import { X, Mail, ShieldCheck, Loader2 } from 'lucide-react'
import {
  saveAdminToken,
  isValidAdminEmail,
} from '@/lib/admin-auth'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

// The OTP is generated and verified on the server — never in the browser.
// So bypassing admin via a localStorage OTP no longer works.
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
      setError('Only the admin email can log in.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send the OTP')
        return
      }
      setStep(2)
      if (data.sent) {
        setInfo('OTP sent. Please enter it within 5 minutes.')
      } else {
        // Dev mode — until the email service is configured
        setDevOtp(data.devPreviewOtp || '')
        setInfo('Email service is not configured yet, so the OTP is shown here (for testing).')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const doVerify = async () => {
    setError('')
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) {
        setError(data.error || 'Could not verify the OTP')
        return
      }
      // Save the signed token from the server — gallery actions use it
      saveAdminToken(data.token)
      onSuccess()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Admin login">
        <button className="admin-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="admin-head">
          <span className="admin-icon"><ShieldCheck size={22} /></span>
          <h3>Admin Login</h3>
          <p>Only the admin can post photos.</p>
        </div>

        {step === 1 ? (
          <div className="admin-body">
            <label className="admin-label">Admin Email</label>
            <div className="admin-input-wrap">
              <Mail size={16} />
              <input
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
              />
            </div>
            {error && <p className="admin-error">{error}</p>}
            {info && <p className="admin-info">{info}</p>}
            <button className="admin-btn" onClick={sendOtp} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> Sending OTP…</> : 'Send OTP'}
            </button>
            <p className="admin-hint">The OTP will be sent to your email.</p>
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
            <button className="admin-btn" onClick={doVerify} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> Verifying…</> : 'Verify & Log In'}
            </button>
            <button className="admin-link" onClick={() => { setStep(1); setError(''); setInfo('') }}>
              Change email / resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
