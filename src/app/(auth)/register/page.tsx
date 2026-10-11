'use client'

import Link from 'next/link'

/**
 * Registro abierto retirado. El acceso a la cuenta es vía alianza
 * Cédula 360 (o credenciales emitidas por un administrador). El editor
 * de imágenes es público y no requiere cuenta.
 */
export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-editor-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-editor-surface rounded-xl border border-editor-border p-8">
          <span className="material-symbols-outlined text-editor-accent text-5xl mb-4">
            verified_user
          </span>
          <h1 className="text-xl font-bold text-editor-text-bright mb-2">
            Acceso con Cédula 360
          </h1>
          <p className="text-editor-text-muted mb-6">
            PhotoClone funciona en alianza con{' '}
            <a
              href="https://cedula360.tech"
              className="text-pc-senal underline underline-offset-2"
            >
              Cédula 360
            </a>
            . Inicia sesión con tu cuenta Cédula 360 o usa el editor sin
            cuenta — es totalmente público.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/login" className="btn btn-primary">
              Continuar con Cédula 360
            </Link>
            <Link href="/editor" className="btn btn-secondary">
              Usar el editor sin cuenta
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
