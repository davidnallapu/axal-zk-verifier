'use client'; // Make sure this file runs on the client side

import { WagmiProvider } from 'wagmi'
import { config } from './config'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <WagmiProvider config={config}>
          <MantineProvider theme={{ fontFamily: 'Open Sans' }}>
            <Notifications />
            {children}
          </MantineProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
