'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Palette, ImagePlus, Film, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store/ui';

const navLinks = [
  { href: '/', label: 'Content', icon: LayoutDashboard },
  { href: '/brand', label: 'Brands', icon: Palette },
  { href: '/create/carousel', label: 'Carousel', icon: ImagePlus },
  { href: '/create/reel', label: 'Reel', icon: Film },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-4">
      {navLinks.map((link) => {
        const isActive =
          link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => {
              if (sidebarOpen) toggleSidebar();
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2.5 text-[15px] transition-colors duration-150',
              isActive
                ? 'border-l-2 border-jelly-mint bg-surface-slate text-white'
                : 'text-muted-text hover:bg-surface-slate'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-[260px] md:min-w-[260px] bg-canvas-black border-r border-surface-slate">
        <div className="p-6">
          <h1 className="font-display text-2xl text-white tracking-wide">VERGE</h1>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={toggleSidebar}
          />
          <aside className="relative z-50 flex flex-col w-[260px] h-full bg-canvas-black border-r border-surface-slate">
            <div className="p-6">
              <h1 className="font-display text-2xl text-white tracking-wide">VERGE</h1>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
