import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ToastContainer from '@/components/ui/ToastContainer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ReserveL - Restaurant Reservation System',
  description: 'A decentralized restaurant reservation system powered by Stellar and Soroban',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="relative min-h-screen bg-black">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 pointer-events-none" />
          
          {/* Content */}
          <main className="relative z-10 flex items-center justify-center min-h-screen p-4">
            {children}
          </main>
          <ToastContainer />
        </div>
      </body>
    </html>
  );
} 