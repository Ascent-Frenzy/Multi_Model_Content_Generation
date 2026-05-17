import type { Metadata } from 'next';
import { Anton, Space_Grotesk, Space_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from '@/lib/providers';
import './globals.css';

const fontDisplay = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
  preload: false,
});

const fontSans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
});

const fontMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Multi-Model Content Generation',
  description: 'AI-powered branded social media content platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          fontDisplay.variable,
          fontSans.variable,
          fontMono.variable,
          'min-h-screen bg-canvas-black text-white antialiased font-sans',
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
