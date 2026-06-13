import React from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

// This is your master layout shell
export default function DashboardLayout({ children }) {
  const { user } = useUser();

  return (
    // 1. THE MASTER CONTAINER
    // flex: Puts children side-by-side
    // h-screen: Makes the app exactly the height of your monitor window
    // bg-slate-50: A very light, elegant gray for the app background
    <div className="flex h-screen bg-slate-50">
      
      {/* 2. THE SIDEBAR */}
      {/* w-64: Width of 16rem (256px) */}
      {/* border-r: Adds a right border to separate it from main content */}
      {/* bg-white: Clean white background */}
      {/* flex flex-col: Stacks logo, links, and profile vertically */}
      <aside className="w-64 border-r border-slate-200 bg-white flex-col hidden md:flex">
        
        {/* Sidebar Header (Logo) */}
        {/* h-16: Height of 4rem (matches the top navbar) */}
        {/* items-center: Centers the logo vertically */}
        {/* px-6: Padding left and right */}
        {/* border-b: Bottom border */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-inner mr-2">💡</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            matcha.ai
          </h1>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <Link to="/hr" className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100">
            📊 Dashboard
          </Link>
          <Link to="/careers" className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100">
            📁 Public Jobs
          </Link>
        </nav>
      </aside>

      {/* 3. THE MAIN CONTENT AREA */}
      {/* flex-1: Takes up all horizontal space left over by the sidebar */}
      {/* flex flex-col: Stacks the Navbar on top of the Page Content */}
      <div className="flex-1 flex flex-col">
        
        {/* THE TOP NAVBAR */}
        {/* h-16: Matches the height of the sidebar header perfectly */}
        {/* justify-between: Pushes the search bar left, and profile right */}
        {/* px-8: Horizontal padding */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-slate-700 font-medium">HR Command Center</span>
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
        {/* overflow-auto: If the list of candidates gets too long, only this section scrolls! */}
        {/* p-8: Generous padding around the edges of the content */}
        <main className="flex-1 overflow-auto p-8">
          {/* The 'children' prop is where your HR tables or Candidate drops zones will magically appear */}
          {children}
        </main>

      </div>
    </div>
  );
}