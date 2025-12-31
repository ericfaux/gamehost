'use client';

import { useState } from 'react';
import { Map, List } from '@/components/icons';
import { TablesManager } from '@/components/admin/TablesManager';
import { FloorPlanCard } from '@/components/admin/floorplan/FloorPlanCard';
import type { VenueTable, VenueZone, VenueTableWithLayout } from '@/lib/db/types';
import type { TableSessionInfo } from '@/components/admin/floorplan/TableNode';

type TabId = 'visual-map' | 'table-list';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'visual-map', label: 'Visual Map', icon: Map },
  { id: 'table-list', label: 'Table List', icon: List },
];

interface FloorPlanPageContentProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  initialTables: VenueTable[];
  zones: VenueZone[];
  tablesWithLayout: VenueTableWithLayout[];
  sessionsMap: Map<string, TableSessionInfo>;
}

export function FloorPlanPageContent({
  venueId,
  venueName,
  venueSlug,
  initialTables,
  zones,
  tablesWithLayout,
  sessionsMap,
}: FloorPlanPageContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('visual-map');

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div
        role="tablist"
        aria-label="Floor plan views"
        className="flex items-center gap-1 p-1 bg-[color:var(--color-elevated)] rounded-xl border border-[color:var(--color-structure)] w-fit"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-[color:var(--color-surface)] shadow-card text-[color:var(--color-ink-primary)]'
                  : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)]/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id="panel-visual-map"
        aria-labelledby="tab-visual-map"
        hidden={activeTab !== 'visual-map'}
      >
        {activeTab === 'visual-map' && (
          <FloorPlanCard
            venueId={venueId}
            zones={zones}
            tables={tablesWithLayout}
            sessionsMap={sessionsMap}
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-table-list"
        aria-labelledby="tab-table-list"
        hidden={activeTab !== 'table-list'}
      >
        {activeTab === 'table-list' && (
          <TablesManager
            initialTables={initialTables}
            venueId={venueId}
            venueName={venueName}
            venueSlug={venueSlug}
          />
        )}
      </div>
    </div>
  );
}
