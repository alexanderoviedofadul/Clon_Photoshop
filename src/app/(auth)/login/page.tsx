'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/marca/Logo'

/** A dónde volver tras entrar: `?next=` si es una ruta interna (p. ej. el editor, desde el aviso de la IA). */
function destinoTrasEntrar(): string {
  const n = new URLSearchParams(window.location.search).get('next')
  return n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/admin'
}

declare global {
  interface Window {
    grecaptcha?: any
  }
}

type Step = 'login' | 'mfa'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('login')
  const [siteKey, setSiteKey] = useState('')
  // estado MFA Cédula 360
  const [sessionId, setSessionId] = useState('')
  const [methods, setMethods] = useState<string[]>([])
  const [method, setMethod] = useState('')
  const [code, setCode] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.recaptcha_site_key) {
          setSiteKey(d.recaptcha_site_key)
          const s = document.createElement('script')
          s.src = `https://www.google.com/recaptcha/api.js?render=${d.recaptcha_site_key}`
          s.async = true
          document.head.appendChild(s)
        }
      })
      .catch(() => {})
  }, [])

  const recaptcha = async (action: string): Promise<string | undefined> => {
    try {
      if (siteKey && window.grecaptcha) {
        return await new Promise((res) =>
          window.grecaptcha.ready(() =>
            window.grecaptcha
              .execute(siteKey, { action })
              .then(res)
              .catch(() => res(undefined))
          )
        )
      }
    } catch {
      /* fail-open */
    }
    return undefined
  }

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await recaptcha('login')
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, recaptcha_token: token }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || 'Credenciales inválidas')
        setLoading(false)
        return
      }
      router.push(destinoTrasEntrar())
      router.refresh()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  const handleCedula360 = async () => {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña de Cédula 360')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await recaptcha('cedula360_login')
      const r = await fetch('/api/auth/cedula360/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, recaptcha_token: token }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || `Error ${r.status} de Cédula 360`)
        setLoading(false)
        return
      }
      if (d.mfa_required) {
        setSessionId(d.session_id)
        setMethods(d.methods || [])
        setMethod((d.methods && d.methods[0]) || 'email_otp')
        setStep('mfa')
        setLoading(false)
        // dispara challenge para métodos que envían código
        if (
          ['email_otp', 'sms_otp', 'whatsapp_otp', 'push'].includes(
            (d.methods && d.methods[0]) || ''
          )
        ) {
          fetch('/api/auth/cedula360/challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: d.session_id,
              method: d.methods[0],
            }),
          }).catch(() => {})
        }
        return
      }
      router.push(destinoTrasEntrar())
      router.refresh()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/cedula360/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, method, code }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || 'Código inválido')
        setLoading(false)
        return
      }
      router.push(destinoTrasEntrar())
      router.refresh()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  const changeMethod = async (m: string) => {
    setMethod(m)
    setCode('')
    if (['email_otp', 'sms_otp', 'whatsapp_otp', 'push'].includes(m)) {
      await fetch('/api/auth/cedula360/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, method: m }),
      }).catch(() => {})
    }
  }

  return (
    <main className="min-h-screen bg-editor-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Acceso a PhotoClone</h1>
        <div className="text-center mb-8">
          <Link href="/" prefetch={false} className="inline-flex mb-3" aria-label="PhotoClone, volver a la portada">
            <Logo alto={40} />
          </Link>
          <p className="text-editor-text-muted">
            {step === 'login'
              ? 'Inicia sesión para gestionar tu cuenta'
              : 'Verificación en dos pasos'}
          </p>
        </div>

        <div className="bg-editor-surface rounded-xl border border-editor-border p-6">
          {error && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'login' && (
            <>
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div>
                  <label htmlFor="acceso-email" className="block text-sm font-medium text-editor-text mb-1">
                    Email
                  </label>
                  <input
                    id="acceso-email"
                    autoComplete="username"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="acceso-clave" className="block text-sm font-medium text-editor-text mb-1">
                    Contraseña
                  </label>
                  <input
                    id="acceso-clave"
                    autoComplete="current-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-editor-border" />
                <span className="text-xs text-editor-text-muted">o</span>
                <div className="flex-1 h-px bg-editor-border" />
              </div>

              <button
                type="button"
                onClick={handleCedula360}
                disabled={loading}
                className="w-full btn btn-secondary py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">
                  verified_user
                </span>
                Continuar con Cédula 360
              </button>
              <p className="mt-3 text-center text-xs text-editor-text-muted">
                Usa el mismo correo y contraseña de tu cuenta Cédula 360.
              </p>
            </>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleVerify} className="space-y-4">
              {methods.length > 1 && (
                <div>
                  <label htmlFor="acceso-metodo" className="block text-sm font-medium text-editor-text mb-1">
                    Método de verificación
                  </label>
                  <select
                    id="acceso-metodo"
                    value={method}
                    onChange={(e) => changeMethod(e.target.value)}
                    className="input"
                  >
                    {methods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="acceso-codigo" className="block text-sm font-medium text-editor-text mb-1">
                  Código ({method})
                </label>
                <input
                  id="acceso-codigo"
                  autoComplete="one-time-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input"
                  placeholder="123456"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar y entrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('login')
                  setError(null)
                }}
                className="w-full text-sm text-editor-text-muted hover:underline"
              >
                Volver
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-editor-text-muted">
            <Link
              href="/editor"
              className="text-pc-senal underline underline-offset-2"
            >
              Usar el editor sin cuenta
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-editor-text-muted">
          En alianza con{' '}
          <a
            href="https://cedula360.tech"
            className="text-pc-senal underline underline-offset-2"
          >
            Cédula 360
          </a>
        </p>
      </div>
    </main>
  )
}
