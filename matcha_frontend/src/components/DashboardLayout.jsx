import React from 'react';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-canvas font-sans text-ink">
      <TopNav />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}