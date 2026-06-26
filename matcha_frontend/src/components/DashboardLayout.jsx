import React from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase } from 'lucide-react';

// This is your master layout shell
export default function DashboardLayout({ children }) {
  const { user } = useUser();

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-colors duration-150 ${
      isActive
        ? 'bg-green-50 text-green-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    // 1. THE MASTER CONTAINER
    <div className="flex h-screen bg-slate-50">

      {/* 2. THE SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 bg-white flex-col hidden md:flex">

        {/* Sidebar Header (Logo) */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-9 h-9 brand-gradient-bg rounded-xl flex items-center justify-center text-white shadow-soft mr-2.5 text-base">
            🍵
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            matcha<span className="text-green-600">.ai</span>
          </h1>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 py-5 px-3 space-y-1">
          <p className="label-eyebrow px-3 mb-2">Workspace</p>
          <NavLink to="/hr" className={navLinkClass}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/careers" className={navLinkClass}>
            <Briefcase size={18} />
            Public Jobs
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs text-slate-500 leading-relaxed">
            Signed in as <span className="font-bold text-slate-700">{user?.publicMetadata?.role || 'Admin'}</span>
          </div>
        </div>
      </aside>

      {/* 3. THE MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* THE TOP NAVBAR */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
          <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-slate-800">HR Command Center</span>
          </h1>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-900 leading-tight">
                 {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}
               </p>
               <p className="text-xs text-slate-500 capitalize">{user?.publicMetadata?.role || 'Admin'}</p>
             </div>
             <UserButton
               userProfileProps={{
                 additionalOAuthScopes: []
               }}
               userProfileUrl="/profile"
             />
          </div>
        </header>

        {/* THE ACTUAL PAGE CONTENT GOES HERE */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
