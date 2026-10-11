/**
 * NEUTRALIZADO: la alianza "Login con Cédula 360" reemplaza a Supabase.
 *
 * El editor de imágenes es PÚBLICO y plenamente usable sin sesión (la
 * transformación es aditiva). El gating de cuenta vive en /admin sobre
 * sesión local MariaDB. Este módulo sólo redirige usuarios ya autenticados
 * fuera de /login y /register. No fuerza login en /editor.
 */
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'clon_ps_session'

export async function updateSession(request: NextRequest) {
  const hasSession = !!request.cookies.get(COOKIE_NAME)?.value
  const path = request.nextUrl.pathname
  if (hasSession && (path === '/login' || path === '/register')) {
    // Con sesión, /login?next=/editor vuelve a donde estaba (solo rutas internas).
    const next = request.nextUrl.searchParams.get('next')
    const destino = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/admin'
    return NextResponse.redirect(new URL(destino, request.url))
  }
  return NextResponse.next({ request: { headers: request.headers } })
}
