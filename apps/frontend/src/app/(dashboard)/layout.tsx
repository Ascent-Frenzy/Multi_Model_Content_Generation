'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { useSocket } from '@/lib/hooks/use-socket';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();

  useSocket();

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/login');
    }
  }, [hydrated, token, router]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-jelly-mint border-t-transparent" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex h-screen bg-canvas-black">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
