import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SpacesProvider } from '@/contexts/SpacesContext'
import { ToastProvider } from '@/contexts/ToastContext'
import Toast from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Metaverse 2D - Virtual World',
  description: 'Experience the future in our 2D metaverse world',
  keywords: 'metaverse, virtual world, 2D, multiplayer, phaser',
  authors: [{ name: 'Aahan' }],
  icons: {
    icon: "/favicon.svg",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider> 
            <SpacesProvider>
              {children}
            </SpacesProvider>
            <Toast />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}