// SERVER ONLY — never import this file in a client component
// Shared storage for OTPs: Blobs on Netlify, memory in local dev.
//
// Reason: `next dev` (on a laptop) has no Netlify Blobs environment,
// so getStore() throws there and /api/send-otp returned "Server error".
// Both OTP routes run in the same Node process, so this
// memory Map stays shared between them — the OTP flow fully works in dev.
// On production (Netlify) the real Blobs store is always used.
import { getStore } from '@netlify/blobs'

type OtpStore = {
  get(key: string, opts?: { type: 'json' }): Promise<any>
  setJSON(key: string, value: any): Promise<void>
  delete(key: string): Promise<void>
}

// In-memory store for local dev (shared inside the process)
const devMemory = new Map<string, any>()

function devStore(): OtpStore {
  return {
    async get(key: string) {
      return devMemory.has(key) ? devMemory.get(key) : null
    },
    async setJSON(key: string, value: any) {
      devMemory.set(key, value)
    },
    async delete(key: string) {
      devMemory.delete(key)
    },
  }
}

let warned = false

export function getOtpStore(): OtpStore {
  try {
    return getStore('solasta-gallery') as unknown as OtpStore
  } catch {
    if (!warned) {
      warned = true
      console.warn('[otp-store] Netlify Blobs not found — using in-memory store for local dev')
    }
    return devStore()
  }
}
