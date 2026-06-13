import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';

// # 1. Fetch the hidden key from your .env.local file
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// # 2. Add a safety guard to prevent the app from crashing silently if the key is missing
if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Security Fault: Missing Clerk Publishable Key. Please check your .env.local file configuration."
  );
}

// # 3. Mount the application tree inside the Clerk Provider matrix
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);