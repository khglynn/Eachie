import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Research Agent',
  description: 'Multi-model AI research assistant for Slack',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
