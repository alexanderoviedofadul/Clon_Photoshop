import { NextRequest } from 'next/server'
import { currentUser, err, userPublic } from '@/lib/auth/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let user
  try {
    user = await currentUser(req)
  } catch (e: any) {
    return err(503, { error: `Persistencia no disponible: ${e?.message || e}` })
  }
  // Sin sesión, 200 con user: null (no 401): el editor y el panel lo consultan al cargar y un 401 ensuciaba la consola.
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user: userPublic(user) })
}
