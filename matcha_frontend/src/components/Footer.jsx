import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-[#f5f5f5] text-[#4e4e4e] font-sans text-[15px] px-[48px] py-[64px] border-t border-[#e7e5e4] mt-auto">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Link to="/" className="font-display text-2xl tracking-tight text-[#0c0a09] mb-4 block">Matcha AI</Link>
          <p className="mb-4 pr-12">Curating talent through intelligent atmospheric design and precise matching.</p>
          <p>&copy; {new Date().getFullYear()} Matcha AI. All rights reserved.</p>
        </div>
        <div>
          <h4 className="font-sans font-medium text-[#0c0a09] mb-4 uppercase tracking-[0.96px] text-[12px]">Platform</h4>
          <ul className="space-y-3">
            <li><Link to="/hr" className="hover:text-[#0c0a09] transition-colors">For HR Teams</Link></li>
            <li><Link to="/candidate" className="hover:text-[#0c0a09] transition-colors">For Candidates</Link></li>
            <li><Link to="/careers" className="hover:text-[#0c0a09] transition-colors">Careers</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-sans font-medium text-[#0c0a09] mb-4 uppercase tracking-[0.96px] text-[12px]">Company</h4>
          <ul className="space-y-3">
            <li><a href="#" className="hover:text-[#0c0a09] transition-colors">About</a></li>
            <li><a href="#" className="hover:text-[#0c0a09] transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-[#0c0a09] transition-colors">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-sans font-medium text-[#0c0a09] mb-4 uppercase tracking-[0.96px] text-[12px]">Legal</h4>
          <ul className="space-y-3">
            <li><a href="#" className="hover:text-[#0c0a09] transition-colors">Privacy</a></li>
            <li><a href="#" className="hover:text-[#0c0a09] transition-colors">Terms</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};
