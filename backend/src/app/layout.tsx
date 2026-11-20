import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BookHaven API',
  description: 'BookHaven Next.js Route Handler API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
