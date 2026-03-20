import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

// 1. Configuramos las fuentes optimizadas
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'], // Los mismos pesos que tenías en tu link
  display: 'swap',
});

// 2. Mantenemos tu metadata intacta
export const metadata: Metadata = {
  title: 'R.G Danza — Academia de Danza',
  description: 'Academia de danza en Córdoba. Ballet, Jazz, Contemporáneo, Acro Tela, Reggaetón y más. Río Negro 4450, Zona Sur.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 3. Inyectamos las variables CSS de las fuentes en la etiqueta html
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}