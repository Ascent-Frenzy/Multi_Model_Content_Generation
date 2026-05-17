'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import { useUIStore } from '@/lib/store/ui';
import { useRouter } from 'next/navigation';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-canvas-black border-b border-surface-slate">
      <button
        className="md:hidden p-2 text-white hover:text-jelly-mint transition-colors"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-secondary-text">{user.email}</span>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          className="bg-surface-slate text-muted-text rounded-xl px-4 hover:bg-surface-slate/80"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
