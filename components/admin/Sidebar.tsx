'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutGrid,
  Library,
  Map,
  List,
  Users,
  MessageSquare,
  BarChart3,
  Settings
} from '@/components/icons';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubNavItem[];
}

interface SubNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional: if view query param is required for this sub-item */
  viewParam?: string;
}

// =============================================================================
// NAVIGATION STRUCTURE
// =============================================================================

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutGrid
  },
  {
    href: '/admin/library',
    label: 'Library',
    icon: Library
  },
  {
    href: '/admin/floorplan',
    label: 'Floor Plan',
    icon: Map,
    subItems: [
      {
        href: '/admin/floorplan?view=map',
        label: 'Visual Map',
        icon: Map,
        viewParam: 'map',
      },
      {
        href: '/admin/floorplan?view=list',
        label: 'Table List',
        icon: List,
        viewParam: 'list',
      },
    ],
  },
  {
    href: '/admin/sessions',
    label: 'Sessions',
    icon: Users
  },
  {
    href: '/admin/feedback',
    label: 'Feedback',
    icon: MessageSquare
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current view param for Floor Plan
  const currentView = searchParams.get('view');

  /**
   * Determine if a nav item is active.
   * For items with sub-items, we check if any sub-item is active.
   * For regular items, we check for exact or prefix match.
   */
  const isItemActive = (item: NavItem): boolean => {
    // For Dashboard, exact match only
    if (item.href === '/admin') {
      return pathname === '/admin';
    }

    // For items with sub-items, check if any sub-item is active
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.some((subItem) => isSubItemActive(subItem));
    }

    // For regular items, check if pathname starts with href
    return pathname.startsWith(item.href);
  };

  /**
   * Determine if a sub-item is active.
   * For Floor Plan sub-items, we check both pathname and view param.
   */
  const isSubItemActive = (subItem: SubNavItem): boolean => {
    const pathMatch = pathname.startsWith('/admin/floorplan');

    if (!pathMatch) return false;

    // If this sub-item has a viewParam, check it matches
    if (subItem.viewParam) {
      // If no view param is set and this is "map" (default), it's active
      if (!currentView && subItem.viewParam === 'map') {
        return true;
      }
      // Otherwise, check exact match
      return currentView === subItem.viewParam;
    }

    return pathMatch;
  };

  return (
    <aside className="w-full lg:w-[260px] border-r border-[color:var(--color-structure)] bg-[color:var(--color-surface)]/90 backdrop-blur-sm min-h-screen">
      {/* Header */}
      <div className="p-5 flex items-center gap-3 border-b border-[color:var(--color-structure)]">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-serif text-xl shadow-lg">
          GH
        </div>
        <div>
          <p className="text-xs tracking-rulebook uppercase text-[color:var(--color-ink-secondary)]">
            Admin Console
          </p>
          <p className="font-semibold text-[color:var(--color-ink-primary)]">GameHost</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          const hasSubItems = item.subItems && item.subItems.length > 0;

          return (
            <div key={item.href}>
              {/* Main Nav Item */}
              <Link
                href={hasSubItems ? item.subItems![0].href : item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group',
                  active
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] hover:bg-stone-100',
                )}
              >
                {/* Orange bookmark effect on active */}
                {active && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-orange-500 rounded-l-full" />
                )}

                <Icon className={cn('h-5 w-5', active ? 'text-orange-600' : '')} />
                <span className="text-sm">{item.label}</span>
              </Link>

              {/* Sub-items (only for Floor Plan) */}
              {hasSubItems && item.subItems && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-stone-200 pl-2">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = isSubItemActive(subItem);

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 relative text-sm',
                          subActive
                            ? 'bg-orange-100/50 text-orange-700 font-medium border-l-2 border-orange-500 -ml-[2px] pl-[10px]'
                            : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] hover:bg-stone-50',
                        )}
                      >
                        <SubIcon className={cn('h-4 w-4', subActive ? 'text-orange-600' : '')} />
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-4 pb-6 mt-auto">
        <div className="rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] p-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
            <span>Tabletop OS</span>
            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold text-[11px]">
              v2.0
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
