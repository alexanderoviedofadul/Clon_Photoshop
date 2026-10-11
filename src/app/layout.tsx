import type { Metadata, Viewport } from 'next'
import './globals.css'

// Identidad del Manual de Marca PhotoClone v1.0 (docs/Manual_Marca_PhotoClone/v1.0). El título anterior,
// «Photoshop Clone», usaba el nombre de un producto de otra empresa: la marca no lo repite.
export const metadata: Metadata = {
  metadataBase: new URL('https://photoshop.cedula360.tech'),
  title: 'PhotoClone · Editor de imágenes por capas con IA',
  description:
    'Separe una imagen en capas con IA, edite cada una con una instrucción de texto y exporte en PNG, ZIP o proyecto. Editor público en el navegador, sin cuenta.',
  applicationName: 'PhotoClone',
  icons: {
    // El SVG lo publica Next desde src/app/icon.svg (lo escribe el build del manual).
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'PhotoClone',
    title: 'PhotoClone · Una imagen, todas sus capas',
    description: 'Separe una imagen en capas con IA, edite cada una con una instrucción y exporte en PNG, ZIP o proyecto.',
    images: [{ url: '/og-photoclone-v1.png', width: 1200, height: 630, alt: 'PhotoClone: una imagen y sus tres capas separadas' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-photoclone-v1.png'] },
}

export const viewport: Viewport = {
  themeColor: '#121212',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
