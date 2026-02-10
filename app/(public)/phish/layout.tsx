import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Secure Login',
  description: 'Security verification',
}

export default function PhishLayout({
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
