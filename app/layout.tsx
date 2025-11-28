import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Research Agent',
  description: 'Multi-model AI research with web search',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8fafc" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
