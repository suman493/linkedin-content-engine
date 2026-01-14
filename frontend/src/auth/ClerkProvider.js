import React from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignIn,
  UserButton as ClerkUserButton,
  useUser as useClerkUser
} from '@clerk/clerk-react';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Auth wrapper that handles both authenticated and unauthenticated states
export function AuthProvider({ children }) {
  // If no Clerk key is configured, show the app without auth (development mode)
  if (!clerkPubKey) {
    return (
      <div>
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
          Development Mode - Auth disabled. Set REACT_APP_CLERK_PUBLISHABLE_KEY to enable.
        </div>
        {children}
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <SignInPage />
      </SignedOut>
    </ClerkProvider>
  );
}

// Sign-in page component
function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-linkedin-blue rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">L</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">LinkedIn Content Engine</h1>
        <p className="text-gray-600 max-w-md">
          Plan, create, and optimize your LinkedIn content with AI-powered insights.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-2">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
              formButtonPrimary: 'bg-linkedin-blue hover:bg-blue-700',
              footerActionLink: 'text-linkedin-blue hover:text-blue-700',
            }
          }}
        />
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Free tier: 20 ideas/month, 5 posts/month</p>
        <p className="mt-1">Upgrade anytime for unlimited access</p>
      </div>
    </div>
  );
}

// Export UserButton and useUser - these work when inside ClerkProvider
// In development mode (no key), these should be guarded in usage
export const UserButton = ClerkUserButton;
export const useUser = useClerkUser;
