import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/clerk-react';

export const TopNav = () => {
  const { openSignIn } = useClerk();

  return (
    <nav className="h-[64px] bg-[#f5f5f5] text-[#0c0a09] flex items-center justify-between px-6 border-b border-[#f0efed] sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link to="/" className="font-display text-2xl tracking-tight -mt-1">Matcha AI</Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/careers" className="font-sans text-[15px] font-medium hover:text-[#777169] transition-colors">Careers</Link>
          <Link to="/hr" className="font-sans text-[15px] font-medium hover:text-[#777169] transition-colors">HR Dashboard</Link>
          <Link to="/candidate" className="font-sans text-[15px] font-medium hover:text-[#777169] transition-colors">Candidate Portal</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/profile" className="font-sans text-[15px] font-medium hover:text-[#777169] transition-colors">Profile</Link>
        <SignedOut>
          <Button variant="primary" onClick={() => openSignIn()}>Sign In</Button>
        </SignedOut>
        <SignedIn>
          <UserButton userProfileUrl="/profile" />
        </SignedIn>
      </div>
    </nav>
  );
};
