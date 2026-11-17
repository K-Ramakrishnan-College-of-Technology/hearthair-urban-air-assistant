import type { User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

interface TopBarProps {
  user: User | null;
  authBusy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function TopBar({ user, authBusy, onSignIn, onSignOut }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#overview"
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
        >
          HearthAir
        </a>

        {/* Zone 2: Clean single-line text navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#overview"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Overview
          </a>
          <a
            href="#routines"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Routine Planner
          </a>
          <a
            href="#indoor-hacks"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Indoor Hacks
          </a>
          <a
            href="#community-lab"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Community Lab
          </a>
          <a
            href="#impact-ledger"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Impact Ledger
          </a>
        </nav>

        {/* Zone 3: Single primary auth action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authBusy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="max-w-[140px] truncate">
                Sign out ({user.displayName?.split(' ')[0] || 'Account'})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authBusy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
