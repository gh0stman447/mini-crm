import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuildFlow CRM',
  description: 'Объекты строительства и задачи',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {

  return (
    <html lang='ru' className='h-full antialiased'>
      <body className='min-h-full flex flex-col'>
        <Suspense fallback={<main className='p-8 text-slate-600'>Загрузка…</main>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
