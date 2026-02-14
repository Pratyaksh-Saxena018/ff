import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'FriendFi - AI Mediated Chat Platform',
  description: 'Real-time chat platform with AI mediation, selective isolation, and multiplayer games',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(220 18% 10%)',
              border: '1px solid hsl(220 14% 18%)',
              color: 'hsl(210 20% 95%)',
            },
          }}
        />
      </body>
    </html>
  )
}
