# Plan: Enhanced Booking List View

## Overview

Transform the booking list view from a date-based display to a true flat list with rich filtering, infinite scroll, and CSV export capabilities.

---

## Current Issues

1. **No data displaying** - The API endpoint `/api/bookings` doesn't exist
2. **Date-locked** - Current design mirrors timeline (single day view)
3. **Limited filtering** - Only status filter available

---

## Implementation Plan

### Phase 1: API Endpoint

**Create `/app/api/bookings/route.ts`**

Query parameters:
- `venueId` (required)
- `startDate` / `endDate` (optional date range)
- `status[]` (optional, array of statuses)
- `tableId` (optional)
- `search` (optional, guest name search)
- `sortField` (default: `start_time`)
- `sortDir` (default: `desc` for newest first)
- `cursor` (for infinite scroll pagination)
- `limit` (default: 25)

Response format:
```json
{
  "bookings": [...],
  "nextCursor": "...",
  "totalCount": 142
}
```

**Data layer function to add in `/lib/data/bookings.ts`:**
- `getBookingsWithFilters()` - supports all filter/sort/pagination options

---

### Phase 2: Quick Filter Presets

**Location:** Above the table, horizontal button group

| Preset | Behavior |
|--------|----------|
| Today | `startDate = today`, `endDate = today` |
| This Week | `startDate = today`, `endDate = +7 days` (default) |
| This Month | `startDate = today`, `endDate = end of month` |
| All Future | `startDate = today`, `endDate = null` |
| Historical | `startDate = null`, `endDate = yesterday` |

- "This Week" selected by default on load
- Historical is visually separated (perhaps right-aligned or different style)
- Only one preset active at a time

---

### Phase 3: Additional Filters

**Filter bar below quick presets:**

1. **Status multi-select dropdown** (existing, enhance)
   - Keep current implementation
   - Add "Active Only" and "Show All" quick options

2. **Table dropdown**
   - Fetch venue tables
   - Single select with "All Tables" default

3. **Guest search**
   - Text input with debounce (300ms)
   - Searches guest name field
   - Clear button when populated

4. **Clear all filters** button
   - Resets to default state (This Week, all statuses, all tables, no search)

---

### Phase 4: List Table Redesign

**Columns (left to right):**

| Column | Width | Sortable | Notes |
|--------|-------|----------|-------|
| Checkbox | 40px | No | Bulk selection |
| Date | 100px | Yes | Format: "Jan 8" or "Jan 8, 2026" if not current year |
| Time | 80px | Yes | Format: "2:30 PM" |
| Table | 100px | Yes | Table label |
| Guest | flex | Yes | Guest name, truncate if needed |
| Party | 60px | No | Number with icon |
| Status | 100px | Yes | StatusBadge component |
| Game | 120px | No | Game title or "—" |
| Actions | 40px | No | Dropdown menu |

**Default sort:** Date + Time descending (newest first)

**Row interactions:**
- Click row → Open BookingDetailDrawer
- Checkbox → Add to bulk selection
- Actions dropdown → Quick actions menu

---

### Phase 5: Infinite Scroll

**Implementation:**
- Use Intersection Observer on a sentinel element at bottom
- Load 25 bookings per batch
- Show loading spinner during fetch
- "No more bookings" message when exhausted

**State management:**
- `bookings: BookingWithDetails[]` - accumulated list
- `nextCursor: string | null` - for pagination
- `isLoadingMore: boolean` - loading state
- `hasMore: boolean` - whether more exist

**Reset scroll position:**
- When any filter changes, reset to top and clear accumulated bookings

---

### Phase 6: CSV Export

**Export button:** Top right, next to view toggle

**Behavior:**
- Exports currently filtered results (all pages, not just loaded)
- Shows progress indicator for large exports
- Downloads as `bookings-export-YYYY-MM-DD.csv`

**CSV columns:**
```
Date, Time, Table, Guest Name, Guest Email, Guest Phone, Party Size, Status, Game, Notes, Created At
```

**Implementation:**
- Client triggers export
- API endpoint `/api/bookings/export` returns CSV stream
- Uses same filter parameters as list view

---

### Phase 7: Empty States

**No bookings found:**
- Icon + "No bookings found"
- Contextual message based on filters:
  - "No bookings for today" (Today filter)
  - "No bookings this week" (This Week filter)
  - "No bookings match your filters" (custom filters)
  - "No historical bookings" (Historical filter)

**Loading state:**
- Skeleton rows (5 rows) on initial load

---

## File Changes Summary

### New Files
1. `/app/api/bookings/route.ts` - Main list API endpoint
2. `/app/api/bookings/export/route.ts` - CSV export endpoint

### Modified Files
1. `/lib/data/bookings.ts` - Add `getBookingsWithFilters()` function
2. `/components/admin/bookings/BookingsList.tsx` - Complete redesign
3. `/components/admin/bookings/BookingsPageClient.tsx` - Minor updates for export button

### New Components (inside BookingsList.tsx or extracted)
- `QuickFilterBar` - Preset filter buttons
- `FilterBar` - Status, table, search filters
- `ExportButton` - CSV export trigger

---

## UI Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Bookings                                         [📊][📋]  [+ New Booking] │
│ Demo Board Game Café                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ [Today] [This Week*] [This Month] [All Future]          [Historical]    │
│                                                                          │
│ Status: [All Statuses ▾]  Table: [All Tables ▾]  Search: [🔍 Guest...  ] │
│                                                          [Clear filters] │
│                                                                          │
│ ☐  DATE ↓    TIME     TABLE    GUEST         PARTY  STATUS      GAME    │
│ ─────────────────────────────────────────────────────────────────────── │
│ ☐  Jan 15   7:00 PM   Table 3  Sarah Chen      4    ◉ Confirmed  Catan  │
│ ☐  Jan 14   6:30 PM   Table 1  Mike Johnson    2    ◉ Confirmed  —      │
│ ☐  Jan 14   5:00 PM   Table 5  Emily Davis     6    ○ Pending    Ticket │
│ ☐  Jan 12   8:00 PM   Table 2  Alex Wong       3    ● Completed  Root   │
│ ...                                                                      │
│                     [Loading more...]                                    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Showing 25 bookings                                    [⬇ Export CSV]   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **API endpoint** - Get data flowing first
2. **Basic list with infinite scroll** - Core functionality
3. **Quick filter presets** - Primary navigation
4. **Additional filters** - Status, table, search
5. **CSV export** - Nice-to-have, last

---

## Questions Resolved

- ✅ Default: Next 7 days ("This Week")
- ✅ Historical: Hidden by default, accessible via "Historical" preset
- ✅ Export: CSV with all filtered results
- ✅ Quick filters: Today, This Week, This Month, All Future, Historical
- ✅ Pagination: Infinite scroll with 25 items per batch
