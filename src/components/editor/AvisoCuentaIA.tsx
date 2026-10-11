'use client'

/**
 * Aviso para quien usa el editor sin sesión y pulsa una función de IA (desde el 11-oct-2026 la IA exige cuenta:
 * /api/layers/* responden 401 sin sesión). El enlace vuelve al editor tras entrar; lo que hay en el lienzo no se
 * conserva al navegar, por eso se sugiere exportar el proyecto antes.
 */
export const LOGIN_IA = '/login?next=/editor'

export function AvisoCuentaIA({ className = '' }: { className?: string }) {
  return (
    <div role="status" className={`p-3 rounded border border-pc-seleccion bg-pc-seleccion/30 text-xs text-editor-text ${className}`}>
      <p className="font-semibold text-editor-text-bright mb-1">La IA necesita una cuenta</p>
      <p className="mb-2">
        Separar y editar con IA envía la imagen a un servicio externo y solo está disponible con sesión iniciada. El resto
        del editor sigue funcionando sin cuenta.
      </p>
      <p className="mb-2 text-editor-text-muted">Al entrar volverá al editor; exporte antes su proyecto (.photoclone) si quiere conservar lo que tiene en el lienzo.</p>
      <a href={LOGIN_IA} className="text-pc-senal underline underline-offset-2 font-semibold">Iniciar sesión</a>
    </div>
  )
}
