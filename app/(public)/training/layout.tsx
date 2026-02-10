import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security Awareness Training | Parable',
  description: 'Complete your security awareness training',
}

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
