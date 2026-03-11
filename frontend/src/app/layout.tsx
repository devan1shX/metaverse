import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import '@excalidraw/excalidraw/index.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SpacesProvider } from '@/contexts/SpacesContext'
import { ToastProvider } from '@/contexts/ToastContext'
import Toast from '@/components/ui/Toast'

const assistant = localFont({
  src: [
    {
      path: '../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/Assistant/Assistant-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/Assistant/Assistant-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/Assistant/Assistant-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/Assistant/Assistant-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-body',
})

const lilita = localFont({
  src: '../../node_modules/@excalidraw/excalidraw/dist/prod/fonts/Lilita/Lilita-Regular-i7dPIFZ9Zz-WBtRtedDbYEF8RXi4EwQ.woff2',
  variable: '--font-display',
})

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
    <html lang="en">
      <body className={`${assistant.variable} ${lilita.variable} font-sans`}>
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
