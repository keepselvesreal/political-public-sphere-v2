import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/providers/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ElectionPulse - Election Analysis Hub',
  description: 'Compare expert predictions and analysis from leading political analysts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
          >
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}