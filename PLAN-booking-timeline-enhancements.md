# Plan: Booking Timeline View Enhancements

## Overview

This plan addresses three key improvements to the Admin UI → Bookings Tab → Timeline View:

1. **Remove Active Sessions** - Show only bookings, not active sessions
2. **Improve Booking Visibility** - Make booked timeslots larger and more readable
3. **Calendar View Modes** - Activate calendar icon for weekly/monthly views

---

## Current State Analysis

### Files Involved
| File | Purpose |
|------|---------|
| `components/admin/bookings/Timeline.tsx` | Main timeline component with date navigation |
| `components/admin/bookings/TimelineRow.tsx` | Individual table rows |
| `components/admin/bookings/TimelineBlock.tsx` | Booking/session block rendering |
| `lib/data/timeline.ts` | Data fetching (bookings + sessions) |
| `app/actions/timeline.ts` | Server action for timeline data |

### Current Constants
- `ROW_HEIGHT = 48px` (quite condensed)
- `HEADER_HEIGHT = 32px`
- `PIXELS_PER_HOUR = 120px` (horizontal scale)
- `MIN_BLOCK_WIDTH = 40px`

---

## Enhancement 1: Remove Active Sessions from Timeline

### Problem
The timeline currently displays both bookings AND active sessions. Users only want to see bookings in this view.

### Solution
Add a filter option in `lib/data/timeline.ts` to exclude session blocks.

### Implementation Steps

1. **Modify `TimelineOptions` interface** (`lib/data/timeline.ts`)
   - Add `includeSessionss?: boolean` option (default: `false`)

2. **Update `getTimelineData()` function** (`lib/data/timeline.ts`)
   - Skip session fetching when `includeSessions` is false
   - Skip session-to-block transformation

3. **Update server action** (`app/actions/timeline.ts`)
   - Pass through the new option

4. **Update Timeline component** (`Timeline.tsx`)
   - Optionally add a toggle if we want to give users the choice later

### Code Location
- `lib/data/timeline.ts` lines ~380-420 (session fetching logic)
- Look for `// Step 3: Fetch active sessions`

---

## Enhancement 2: Improve Booking Visibility

### Problem
- Booking blocks are too condensed/small to read
- Text gets cut off, especially guest names and times
- Row height of 48px is insufficient for good readability

### Solution
Increase row height, adjust block styling, and improve text display.

### Implementation Steps

1. **Increase Row Height** (`Timeline.tsx`)
   - Change `ROW_HEIGHT` from `48` to `64` or `72` pixels
   - This gives more vertical space for block content

2. **Increase Pixels Per Hour** (`Timeline.tsx`)
   - Consider increasing `PIXELS_PER_HOUR` from `120` to `150` or `180`
   - Gives more horizontal space for short bookings
   - Trade-off: requires more horizontal scrolling

3. **Improve Block Content Layout** (`TimelineBlock.tsx`)
   - Adjust text sizing and truncation
   - Show more information when space allows
   - Consider two-line layout: name + time on separate lines

4. **Enhance Block Styling** (`TimelineBlock.tsx`)
   - Increase minimum block width from `40px` to `60px` or more
   - Add better contrast/borders for visibility
   - Consider bolder fonts or background colors

5. **Table Labels Column** (`TimelineRow.tsx`)
   - May need to adjust width to accommodate larger row heights
   - Currently uses `TableLabels` component

### Suggested Values
```
Current → Proposed
ROW_HEIGHT: 48px → 72px
PIXELS_PER_HOUR: 120px → 150px
MIN_BLOCK_WIDTH: 40px → 60px
```

---

## Enhancement 3: Calendar View Modes (Weekly/Monthly)

### Problem
The calendar icon in the header (`Timeline.tsx` line 206-208) does nothing. Users expect standard calendar app behavior with day/week/month views.

### Solution
Implement a calendar picker dropdown with view mode selection.

### Implementation Steps

#### Phase 1: Date Picker Dropdown
1. **Add calendar popover** (`Timeline.tsx`)
   - Use shadcn/ui Calendar component
   - Show on calendar icon click
   - Allow quick date selection

#### Phase 2: View Mode Selector
2. **Create view mode state**
   - Add `viewMode: 'day' | 'week' | 'month'` state
   - Store in URL params or local state

3. **Add view mode toggle UI**
   - Options: Day | Week | Month buttons or dropdown
   - Position near calendar icon

#### Phase 3: Weekly View Implementation
4. **Create `WeeklyTimeline` component**
   - 7-column layout (one per day)
   - Condensed day summaries
   - Click to drill down to day view
   - Show booking counts per table per day

5. **Update data fetching** (`lib/data/timeline.ts`)
   - Add `getWeeklyTimelineData()` function
   - Fetch entire week's bookings in one query
   - Group by date and table

#### Phase 4: Monthly View Implementation
6. **Create `MonthlyTimeline` component**
   - Traditional calendar grid layout
   - Show booking counts per day
   - Color coding for busy days
   - Click to drill down to day view

7. **Update data fetching** (`lib/data/timeline.ts`)
   - Add `getMonthlyTimelineData()` function
   - Aggregate counts by date

### View Mode Behaviors
| View | Display | Navigation |
|------|---------|------------|
| Day | Current Gantt-style timeline | ← → by day |
| Week | 7-day grid with booking summaries | ← → by week |
| Month | Calendar grid with daily counts | ← → by month |

### UI Wireframe Concept
```
┌─────────────────────────────────────────────────────────┐
│  < Friday, January 16  >    [Today] [Day|Week|Month] 📅 │
├─────────────────────────────────────────────────────────┤
│  (Timeline content based on selected view mode)         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Priority & Phases

### Phase 1 (Quick Wins) - Estimated: 1 session
- [ ] Remove sessions from timeline (Enhancement 1)
- [ ] Increase row height and block visibility (Enhancement 2)

### Phase 2 (Date Picker) - Estimated: 1 session
- [ ] Add calendar popover for date selection
- [ ] Add view mode toggle buttons

### Phase 3 (Weekly View) - Estimated: 1-2 sessions
- [ ] Create weekly data fetching
- [ ] Build weekly view component
- [ ] Integrate with navigation

### Phase 4 (Monthly View) - Estimated: 1 session
- [ ] Create monthly data fetching
- [ ] Build monthly calendar component
- [ ] Integrate with navigation

---

## Considerations & Trade-offs

### Visibility Improvements
- **Larger rows** = better readability but fewer visible rows without scrolling
- **More pixels per hour** = better for short bookings but more horizontal scrolling
- **Recommendation**: Start with `ROW_HEIGHT: 64px` and `PIXELS_PER_HOUR: 140px`, adjust based on feedback

### View Modes
- **Complexity**: Weekly/monthly views are significant new features
- **Alternative**: Could start with just the date picker popover as Phase 2
- **Data loading**: Weekly view needs efficient batch loading strategy

### Backwards Compatibility
- Session filtering should be opt-in/configurable in case needed later
- View mode should default to "day" to maintain current behavior

---

## Questions for Clarification

1. **Row height preference**: 64px (modest increase) or 72px (larger)?
2. **Pixels per hour**: Stay at 120 or increase to 140-150?
3. **Weekly view priority**: Is this needed immediately or can it follow after Phase 1-2?
4. **Monthly view**: Full calendar with booking details or just day counts?
5. **Session toggle**: Should there be a UI toggle to show/hide sessions, or always hide them?

---

## Files to Create/Modify

### Modify
- `lib/data/timeline.ts` - Add session filtering
- `app/actions/timeline.ts` - Pass through options
- `components/admin/bookings/Timeline.tsx` - Constants, calendar popover, view mode
- `components/admin/bookings/TimelineBlock.tsx` - Block sizing/layout
- `components/admin/bookings/TimelineRow.tsx` - Adjust for new dimensions

### Create (Phase 3-4)
- `components/admin/bookings/WeeklyTimeline.tsx` - New weekly view
- `components/admin/bookings/MonthlyTimeline.tsx` - New monthly view
- `lib/data/timeline-weekly.ts` - Weekly data fetching (or extend existing)
- `lib/data/timeline-monthly.ts` - Monthly data fetching (or extend existing)

---

## Ready for Review

Please review this plan and let me know:
1. Any priorities to adjust
2. Specific values you'd prefer for sizing
3. Whether to proceed with all phases or start with Phase 1-2
