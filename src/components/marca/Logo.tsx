/**
 * Marca de PhotoClone (Manual de Marca v1.0, docs/Manual_Marca_PhotoClone/v1.0).
 * El símbolo es la misma geometría que el maestro pc-simbolo.svg: cuadro Grafito de 100 u con radio 22 y tres
 * capas de 44 u con radio 8 —FONDO, FIGURA y TEXTO— separadas 12 u en diagonal, cada una con un filete de 5 u
 * del color del cuadro. El audit del manual compara estas cifras con el maestro: no cambiarlas aquí.
 * El logotipo completo es un SVG con el nombre en curvas (public/marca/pc-horizontal*.svg).
 */
const GRAFITO = '#1E1E1E'

export function Simbolo({ className = '', titulo }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} focusable="false">
      <rect width="100" height="100" rx="22" fill={GRAFITO} />
      <rect x={16} y={16} width={44} height={44} rx={8} fill="#0D9488" stroke={GRAFITO} strokeWidth={5} paintOrder="stroke" />
      <rect x={28} y={28} width={44} height={44} rx={8} fill="#4F46E5" stroke={GRAFITO} strokeWidth={5} paintOrder="stroke" />
      <rect x={40} y={40} width={44} height={44} rx={8} fill="#FBBF24" stroke={GRAFITO} strokeWidth={5} paintOrder="stroke" />
    </svg>
  )
}

/** Logotipo horizontal. `negativo` para fondos oscuros (el editor, la portada); el normal para claros. */
export function Logo({ negativo = true, alto = 32, className = '' }: { negativo?: boolean; alto?: number; className?: string }) {
  const src = negativo ? '/marca/pc-horizontal-negativo.svg' : '/marca/pc-horizontal.svg'
  // Proporción del maestro: 100 u de alto (el ancho lo da el viewBox del SVG).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="PhotoClone" width={Math.round((alto * 437) / 100)} height={alto} className={className} />
}
