import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import ToasterProvider from '@/components/ToasterProvider'
import WhatsAppButton from '@/components/WhatsAppButton'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'R.G Danza — Academia de Danza en Córdoba',
  description: 'Academia de danza en Córdoba. Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más. Clases para todas las edades y niveles. Río Negro 4450, Zona Sur.',
  keywords: ['academia de danza', 'danza córdoba', 'ballet córdoba', 'jazz dance', 'contemporáneo', 'reggaetón', 'acro tela', 'clases de danza', 'danza zona sur córdoba'],
  openGraph: {
    title: 'R.G Danza — Academia de Danza en Córdoba',
    description: 'Academia de danza en Córdoba. Clases para todas las edades y niveles. Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más.',
    siteName: 'R.G Danza',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R.G Danza — Academia de Danza en Córdoba',
    description: 'Academia de danza en Córdoba. Clases para todas las edades y niveles.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <ToasterProvider />
        <WhatsAppButton />
      </body>
    </html>
  )
}
