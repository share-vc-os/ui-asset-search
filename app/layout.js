import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Share Ventures — Asset Explorer',
  description: 'Cross-instance UI asset discovery and search across the Share Ventures fleet',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body style={{ margin: 0, padding: 0, background: '#09090B' }}>{children}</body>
    </html>
  );
}
