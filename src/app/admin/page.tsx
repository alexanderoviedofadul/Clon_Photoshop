'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Simbolo } from '@/components/marca/Logo'

interface U {
  id: number
  email: string
  name: string
  role: 'admin' | 'viewer'
  active: boolean
  created_at: string | null
  last_login_at: string | null
}

export default function AdminPage() {
  const [me, setMe] = useState<U | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'profile' | 'sessions' | 'apikeys'>('profile')
  const [users, setUsers] = useState<U[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [keyForm, setKeyForm] = useState({ name: '', owner: '', scopes: 'decompose,edit,transform', ratePerMin: '60', monthlyQuota: '' })
  const [newKeyPlain, setNewKeyPlain] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'viewer',
  })
  const [profile, setProfile] = useState({ name: '', password: '' })

  const loadMe = useCallback(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setMe(d?.user ?? null)
        setProfile({ name: d?.user?.name || '', password: '' })
        setLoading(false)
        if (d?.user?.role === 'admin') setTab('users')
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(loadMe, [loadMe])

  const loadUsers = () =>
    fetch('/api/admin/users', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {})

  const loadSessions = () =>
    fetch('/api/admin/sessions', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {})

  const loadApiKeys = () =>
    fetch('/api/admin/api-keys', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setApiKeys(d.keys || []))
      .catch(() => {})

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewKeyPlain('')
    const r = await fetch('/api/admin/api-keys', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: keyForm.name,
        owner: keyForm.owner,
        scopes: keyForm.scopes.split(',').map((s) => s.trim()).filter(Boolean),
        ratePerMin: keyForm.ratePerMin,
        monthlyQuota: keyForm.monthlyQuota,
      }),
    })
    const d = await r.json()
    if (r.ok && d.key) {
      setNewKeyPlain(d.key)
      setMsg('API key creada. Cópiala ahora: no se vuelve a mostrar.')
      setKeyForm({ name: '', owner: '', scopes: 'decompose,edit,transform', ratePerMin: '60', monthlyQuota: '' })
      loadApiKeys()
    } else {
      setMsg(d.error || 'Error al crear la API key')
    }
  }

  const revokeApiKey = async (id: number) => {
    if (!confirm('¿Revocar esta API key? Las peticiones con ella dejarán de funcionar.')) return
    await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE', credentials: 'include' })
    loadApiKeys()
  }

  useEffect(() => {
    if (tab === 'users' && me?.role === 'admin') loadUsers()
    if (tab === 'sessions') loadSessions()
    if (tab === 'apikeys' && me?.role === 'admin') loadApiKeys()
  }, [tab, me])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    })
    const d = await r.json()
    if (!r.ok) {
      setMsg(d.error || 'Error')
      return
    }
    setForm({ email: '', name: '', password: '', role: 'viewer' })
    setMsg('Usuario creado')
    loadUsers()
  }

  const toggleActive = async (u: U) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ active: !u.active }),
    })
    loadUsers()
  }

  const setRole = async (u: U, role: string) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    })
    loadUsers()
  }

  const delUser = async (u: U) => {
    if (!confirm(`¿Eliminar ${u.email}?`)) return
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    loadUsers()
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const body: any = { name: profile.name }
    if (profile.password) body.password = profile.password
    const r = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const d = await r.json()
    setMsg(r.ok ? 'Perfil actualizado' : d.error || 'Error')
    if (r.ok) setProfile({ ...profile, password: '' })
  }

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    window.location.href = '/'
  }

  if (loading)
    return (
      <main className="min-h-screen bg-editor-bg flex items-center justify-center text-editor-text-muted" role="status">
        Cargando…
      </main>
    )

  if (!me)
    return (
      <main className="min-h-screen bg-editor-bg flex items-center justify-center p-4">
        <div className="bg-editor-surface rounded-xl border border-editor-border p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-editor-text-bright mb-2">
            Sesión requerida
          </h1>
          <p className="text-editor-text-muted mb-6">
            Inicia sesión para acceder al panel de cuenta.
          </p>
          <Link href="/login" className="btn btn-primary">
            Iniciar Sesión
          </Link>
        </div>
      </main>
    )

  return (
    <div className="min-h-screen bg-editor-bg text-editor-text">
      <header className="border-b border-editor-border">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 rounded px-2 py-1 hover:bg-editor-surface-hover transition-colors"
            title="Volver a la página de inicio"
          >
            <Simbolo className="w-7 h-7" />
            <span className="font-bold text-editor-text-bright">
              PhotoClone · Cuenta
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-editor-text-muted">
              {me.email} · {me.role}
            </span>
            <Link href="/" prefetch={false} className="text-editor-text-muted hover:text-editor-text-bright transition-colors">
              Inicio
            </Link>
            <Link href="/editor" className="text-pc-senal underline underline-offset-2">
              Editor
            </Link>
            <button
              onClick={logout}
              className="text-editor-text-muted hover:text-red-400"
            >
              Salir
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="sr-only">Cuenta de PhotoClone</h1>
        <div className="flex gap-2 mb-6 border-b border-editor-border">
          {me.role === 'admin' && (
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 ${
                tab === 'users'
                  ? 'border-b-2 border-editor-accent text-editor-text-bright'
                  : 'text-editor-text-muted'
              }`}
            >
              Usuarios
            </button>
          )}
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2 ${
              tab === 'profile'
                ? 'border-b-2 border-editor-accent text-editor-text-bright'
                : 'text-editor-text-muted'
            }`}
          >
            Mi perfil
          </button>
          <button
            onClick={() => setTab('sessions')}
            className={`px-4 py-2 ${
              tab === 'sessions'
                ? 'border-b-2 border-editor-accent text-editor-text-bright'
                : 'text-editor-text-muted'
            }`}
          >
            Sesiones
          </button>
          {me.role === 'admin' && (
            <button
              onClick={() => setTab('apikeys')}
              className={`px-4 py-2 ${
                tab === 'apikeys'
                  ? 'border-b-2 border-editor-accent text-editor-text-bright'
                  : 'text-editor-text-muted'
              }`}
            >
              API Keys
            </button>
          )}
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-editor-active/30 border border-editor-border rounded-lg text-sm">
            {msg}
          </div>
        )}

        {tab === 'users' && me.role === 'admin' && (
          <div className="space-y-8">
            <form
              onSubmit={createUser}
              className="bg-editor-surface border border-editor-border rounded-xl p-6 grid sm:grid-cols-2 gap-4"
            >
              <h3 className="sm:col-span-2 font-semibold text-editor-text-bright">
                Crear usuario
              </h3>
              <input
                className="input"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Contraseña (min 8)"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
              />
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
              <button className="btn btn-primary sm:col-span-2">
                Crear
              </button>
            </form>

            <div className="bg-editor-surface border border-editor-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-editor-text-muted border-b border-editor-border">
                  <tr>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Rol</th>
                    <th className="text-left p-3">Activo</th>
                    <th className="text-left p-3">Último login</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-editor-border/50"
                    >
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => setRole(u, e.target.value)}
                          className="bg-editor-bg border border-editor-border rounded px-2 py-1"
                        >
                          <option value="viewer">viewer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleActive(u)}
                          className={
                            u.active ? 'text-green-400' : 'text-red-400'
                          }
                        >
                          {u.active ? 'sí' : 'no'}
                        </button>
                      </td>
                      <td className="p-3 text-editor-text-muted">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => delUser(u)}
                          className="text-red-400 hover:underline"
                        >
                          eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <form
            onSubmit={saveProfile}
            className="bg-editor-surface border border-editor-border rounded-xl p-6 max-w-md space-y-4"
          >
            <h3 className="font-semibold text-editor-text-bright">
              Mi perfil
            </h3>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input" value={me.email} disabled />
            </div>
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input
                className="input"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Nueva contraseña (opcional, min 8)
              </label>
              <input
                className="input"
                type="password"
                value={profile.password}
                onChange={(e) =>
                  setProfile({ ...profile, password: e.target.value })
                }
              />
            </div>
            <button className="btn btn-primary">Guardar</button>
          </form>
        )}

        {tab === 'sessions' && (
          <div className="bg-editor-surface border border-editor-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-editor-text-muted border-b border-editor-border">
                <tr>
                  <th className="text-left p-3">Token</th>
                  <th className="text-left p-3">Creada</th>
                  <th className="text-left p-3">Expira</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-b border-editor-border/50">
                    <td className="p-3 font-mono">{s.token_preview}</td>
                    <td className="p-3">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="p-3">
                      {s.expires_at
                        ? new Date(s.expires_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="p-3">{s.ip}</td>
                    <td className="p-3 text-editor-text-muted truncate max-w-xs">
                      {s.user_agent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'apikeys' && me.role === 'admin' && (
          <div className="space-y-8">
            <form
              onSubmit={createApiKey}
              className="bg-editor-surface border border-editor-border rounded-xl p-6 grid sm:grid-cols-2 gap-4"
            >
              <div className="sm:col-span-2 font-semibold text-editor-text-bright">
                Nueva API key
              </div>
              <input
                className="input" placeholder="Nombre (ej: Cédula 360 - producción)"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                required
              />
              <input
                className="input" placeholder="Propietario (ej: cedula360.tech)"
                value={keyForm.owner}
                onChange={(e) => setKeyForm({ ...keyForm, owner: e.target.value })}
              />
              <input
                className="input" placeholder="Scopes (coma): decompose,edit,transform"
                value={keyForm.scopes}
                onChange={(e) => setKeyForm({ ...keyForm, scopes: e.target.value })}
              />
              <input
                className="input" type="number" placeholder="Rate/min"
                value={keyForm.ratePerMin}
                onChange={(e) => setKeyForm({ ...keyForm, ratePerMin: e.target.value })}
              />
              <input
                className="input" type="number" placeholder="Cuota mensual (vacío = ilimitada)"
                value={keyForm.monthlyQuota}
                onChange={(e) => setKeyForm({ ...keyForm, monthlyQuota: e.target.value })}
              />
              <button className="btn btn-primary sm:col-span-2">Generar API key</button>
            </form>

            {newKeyPlain && (
              <div className="bg-editor-active/30 border border-editor-accent rounded-xl p-4">
                <p className="text-sm mb-2 text-editor-text-bright">
                  Copia esta clave ahora — no se vuelve a mostrar:
                </p>
                <code className="block break-all bg-editor-bg p-3 rounded font-mono text-sm select-all">
                  {newKeyPlain}
                </code>
              </div>
            )}

            <div className="bg-editor-surface border border-editor-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-editor-text-muted border-b border-editor-border">
                  <tr>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Propietario</th>
                    <th className="text-left p-3">Prefijo</th>
                    <th className="text-left p-3">Scopes</th>
                    <th className="text-left p-3">Uso (mes/total)</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="border-b border-editor-border/50">
                      <td className="p-3">{k.name}</td>
                      <td className="p-3 text-editor-text-muted">{k.owner || '—'}</td>
                      <td className="p-3 font-mono text-xs">{k.prefix}…</td>
                      <td className="p-3 text-xs">{k.scopes.join(', ')}</td>
                      <td className="p-3">{k.used_month}/{k.used_total}{k.monthly_quota ? ` · cuota ${k.monthly_quota}` : ''}</td>
                      <td className="p-3">
                        {k.active ? (
                          <span className="text-editor-success">activa</span>
                        ) : (
                          <span className="text-editor-text-muted">revocada</span>
                        )}
                      </td>
                      <td className="p-3">
                        {k.active && (
                          <button
                            onClick={() => revokeApiKey(k.id)}
                            className="text-red-400 hover:underline"
                          >
                            Revocar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-editor-text-muted">Sin API keys</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-editor-border py-6 text-center text-xs text-editor-text-muted">
        PhotoClone · en alianza con{' '}
        <a
          href="https://cedula360.tech"
          className="text-pc-senal underline underline-offset-2"
        >
          Cédula 360
        </a>{' '}
        · info@cedula360.tech
      </footer>
    </div>
  )
}
