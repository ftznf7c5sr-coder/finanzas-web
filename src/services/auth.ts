import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore'
import { auth, db } from 'src/firebase'

// ── Module state (persists within a session) ────────────────────────────────

let _pendingTwoFactor = false
let _twoFactorEnabled = false
let _twoFactorSecret: string | undefined
let _pendingUsername = ''

function toEmail(username: string): string {
  return `${username.toLowerCase()}@finanzas.local`
}

// ── TOTP (RFC 6238 via Web Crypto) ──────────────────────────────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c); bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return new Uint8Array(out)
}

function generateTotpSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

async function totpAt(secret: string, ms: number): Promise<string> {
  const T = Math.floor(ms / 30_000)
  const buf = new ArrayBuffer(8)
  new DataView(buf).setUint32(4, T, false)
  const keyBytes = base32Decode(secret)
  const keyBuffer = new Uint8Array(keyBytes).buffer as ArrayBuffer
  const key = await crypto.subtle.importKey(
    'raw', keyBuffer,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false, ['sign']
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const o = sig[19] & 0xf
  const code = (((sig[o] & 0x7f) << 24) | (sig[o+1] << 16) | (sig[o+2] << 8) | sig[o+3]) % 1_000_000
  return code.toString().padStart(6, '0')
}

async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const t = token.replace(/\s/g, '')
  const now = Date.now()
  for (let i = -1; i <= 1; i++) {
    if (await totpAt(secret, now + i * 30_000) === t) return true
  }
  return false
}

function totpUri(secret: string, username: string): string {
  const issuer = 'Finanzas Puchi'
  const label = encodeURIComponent(`${issuer}:${username}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// ── Public API ──────────────────────────────────────────────────────────────

export const AuthService = {
  async loadUserProfile(uid: string): Promise<void> {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const data = snap.data()
      _twoFactorEnabled = data.twoFactorEnabled ?? false
      _twoFactorSecret = data.twoFactorSecret
    } else {
      _twoFactorEnabled = false
      _twoFactorSecret = undefined
    }
  },

  async register(username: string, password: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password)
    await updateProfile(cred.user, { displayName: username })
    await setDoc(doc(db, 'users', cred.user.uid), { twoFactorEnabled: false })
    _twoFactorEnabled = false
    _twoFactorSecret = undefined
    _pendingTwoFactor = false
    localStorage.setItem('fp_registered', '1')
  },

  async login(username: string, password: string): Promise<{ success: false } | { success: true; requiresTwoFactor: boolean }> {
    try {
      const cred = await signInWithEmailAndPassword(auth, toEmail(username), password)
      await AuthService.loadUserProfile(cred.user.uid)
      localStorage.setItem('fp_registered', '1')

      if (_twoFactorEnabled && _twoFactorSecret) {
        _pendingTwoFactor = true
        _pendingUsername = username
        return { success: true, requiresTwoFactor: true }
      }

      _pendingTwoFactor = false
      return { success: true, requiresTwoFactor: false }
    } catch {
      return { success: false }
    }
  },

  async loginWithTwoFactor(code: string): Promise<boolean> {
    if (!_twoFactorSecret) return false
    const ok = await verifyTotp(_twoFactorSecret, code)
    if (ok) _pendingTwoFactor = false
    return ok
  },

  generateTwoFactorSetup(): { secret: string; uri: string } {
    const username = auth.currentUser?.displayName ?? _pendingUsername ?? 'user'
    const secret = generateTotpSecret()
    return { secret, uri: totpUri(secret, username) }
  },

  async enableTwoFactor(secret: string, code: string): Promise<boolean> {
    const ok = await verifyTotp(secret, code)
    if (!ok) return false
    const uid = auth.currentUser?.uid
    if (!uid) return false
    await updateDoc(doc(db, 'users', uid), { twoFactorEnabled: true, twoFactorSecret: secret })
    _twoFactorEnabled = true
    _twoFactorSecret = secret
    return true
  },

  async disableTwoFactor(code: string): Promise<boolean> {
    if (!_twoFactorSecret) return false
    const ok = await verifyTotp(_twoFactorSecret, code)
    if (!ok) return false
    const uid = auth.currentUser?.uid
    if (!uid) return false
    await updateDoc(doc(db, 'users', uid), {
      twoFactorEnabled: false,
      twoFactorSecret: deleteField()
    })
    _twoFactorEnabled = false
    _twoFactorSecret = undefined
    return true
  },

  hasTwoFactor(): boolean {
    return _twoFactorEnabled
  },

  logout(): void {
    _pendingTwoFactor = false
    _twoFactorEnabled = false
    _twoFactorSecret = undefined
    void signOut(auth)
  },

  isRegistered(): boolean {
    return localStorage.getItem('fp_registered') !== null
  },

  isLoggedIn(): boolean {
    return auth.currentUser !== null && !_pendingTwoFactor
  },

  getUsername(): string {
    return auth.currentUser?.displayName ?? ''
  },
}
