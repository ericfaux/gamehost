# Dashboard QA Checklist

Manual QA scenarios for verifying the admin dashboard works end-to-end.

## Prerequisites

- Access to a venue admin account
- At least one table configured
- At least one game in the library

---

## 1. Alert: Stale Browsing Session

**Scenario:** Alert appears when a guest is browsing at a table for too long

### Setup
1. Start a session at a table (guest flow via QR code)
2. Do NOT select a game (stay on browsing screen)
3. Wait 15+ minutes (or temporarily lower `BROWSING_STALE_THRESHOLD_MINUTES` in `lib/data/dashboard.ts`)

### Verification
- [ ] Alert appears in dashboard under **Tables** category
- [ ] Alert severity is `medium` (orange dot) for 15-20 min
- [ ] Alert severity increases to `high` (red dot) if >20 min OR table has >4 seats
- [ ] Context chips show: Duration (e.g., "18m"), Seat count
- [ ] Duration chip is orange if ≤20m, red if >20m
- [ ] Click **"Assign game"** → modal opens with that table listed
- [ ] Assign a game from the modal
- [ ] Refresh dashboard → alert disappears

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateBrowsingStaleAlerts()`
- Threshold: 15 minutes (`BROWSING_STALE_THRESHOLD_MINUTES`)

---

## 2. Alert: Bottlenecked Game

**Scenario:** Alert appears when all copies of a game are in use

### Setup
1. Go to Library and set a game's `copies_in_rotation` to 1
2. Start a session and select that game
3. Navigate to dashboard

### Verification
- [ ] Alert appears under **Maintenance** category
- [ ] Context chip shows copy usage (e.g., "1/1 in use")
- [ ] If game is in top 5 popular games (last 7 days), shows "Popular" chip
- [ ] Popular games get severity boost
- [ ] Click **"Increase copies"** → navigates to `/admin/library?filter=bottlenecked`
- [ ] Game is highlighted/filtered in the library view

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateGameBottleneckAlerts()`
- Popularity lookback: 7 days

---

## 3. Alert: Problematic Game

**Scenario:** Alert appears when a game is marked as problematic

### Setup
1. Go to Library
2. Set a game's condition to "problematic"
3. Navigate to dashboard

### Verification
- [ ] Alert appears under **Maintenance** category
- [ ] Base severity is `medium` (orange dot)
- [ ] If game is also bottlenecked, severity is `high` (red dot)
- [ ] Click **"View in Library"** → navigates to `/admin/library?filter=problematic`
- [ ] Game is visible with problematic filter active

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateGameMaintenanceAlerts()`

---

## 4. Alert: Game Out for Repair

**Scenario:** Alert appears when a game is out for repair

### Setup
1. Go to Library
2. Set a game's status to "out_for_repair"
3. Navigate to dashboard

### Verification
- [ ] Alert appears under **Maintenance** category
- [ ] Severity is `low` (gray dot)
- [ ] Click action → navigates to `/admin/library?filter=out_for_repair`

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateGameMaintenanceAlerts()`

---

## 5. Alert: Negative Feedback (Game)

**Scenario:** Alert appears when a game receives negative ratings

### Setup
1. End a session with a game
2. Submit feedback with rating < 3 (thumbs down / 1-2 stars)
3. Navigate to dashboard (feedback must be within last 24 hours)

### Verification
- [ ] Alert appears under **Experience** category
- [ ] Severity is `low` (gray dot)
- [ ] Context chip shows count of negative ratings
- [ ] Click action → shows feedback details or navigates to feedback view

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateFeedbackAlerts()`
- Lookback period: 24 hours

---

## 6. Alert: Negative Feedback (Venue)

**Scenario:** Alert appears when venue receives negative ratings

### Setup
1. End a session
2. Submit venue feedback with rating < 3
3. Add a comment to at least one feedback entry
4. Navigate to dashboard

### Verification
- [ ] Alert appears under **Experience** category
- [ ] Base severity is `medium` (orange dot)
- [ ] If any feedback has comments, severity is `high` (red dot)
- [ ] Context chip shows "Has comments" if applicable
- [ ] Click **"View comments"** → shows feedback details

### Code Reference
- Alert generator: `lib/data/dashboard.ts` → `generateFeedbackAlerts()`

---

## 7. Pulse Tiles: Correct Counts

**Scenario:** Pulse tiles display accurate real-time metrics

### Setup
Create various session states in the database or via guest flow:
- Multiple active sessions (some playing games, some browsing)
- Some sessions browsing for >15 minutes
- Games marked as problematic or out_for_repair
- Recent feedback submissions

### Verification

#### Active Tables Tile
- [ ] Count matches sessions with `ended_at IS NULL`
- [ ] Tile uses `accent` tone (always)

#### Waiting Tile
- [ ] Count matches browsing sessions (no game selected) > 15 min threshold
- [ ] Tone is `danger` (red) if count ≥ 3
- [ ] Tone is `warn` (orange) if count > 0 but < 3
- [ ] Tone is `default` (gray) if count = 0

#### Issues Tile
- [ ] Count matches: problematic games + out_for_repair games
- [ ] Tone follows same rules as Waiting tile

#### Venue Pulse Tile
- [ ] Shows average rating from last 24h feedback
- [ ] Shows count of ratings
- [ ] Tone is `success` (green) if avg ≥ 4
- [ ] Tone is `default` if avg 3-3.9
- [ ] Tone is `warn` if avg < 3
- [ ] Shows "--" if no ratings

### Code Reference
- Data fetch: `lib/data/dashboard.ts` → `getOpsHud()`
- Component: `components/admin/dashboard/PulseTile.tsx`

---

## 8. Activity Feed Updates

**Scenario:** Activity feed shows recent session and feedback activity

### Setup
1. End a session (with or without feedback)
2. Refresh dashboard

### Verification

#### Recently Ended Sessions
- [ ] Session appears in the "Recently Ended" section
- [ ] Shows up to 5 most recent sessions
- [ ] Displays table name and game played
- [ ] Shows session duration or end time

#### Recent Feedback
- [ ] Feedback appears in the "Recent Feedback" section
- [ ] Shows up to 5 most recent feedback entries
- [ ] Star ratings are displayed
- [ ] Negative feedback (< 3 stars) is highlighted

### Code Reference
- Component: `components/admin/dashboard/ActivityFeed.tsx`
- Data: Last 5 sessions and 5 feedback entries

---

## 9. Bottleneck Widget Accuracy

**Scenario:** Bottleneck widget shows games with high copy utilization

### Setup
Create bottleneck conditions:
1. Set multiple games to have limited copies
2. Start sessions using those games until copies_in_use approaches copies_in_rotation

### Verification
- [ ] Widget shows top 3 bottlenecked games
- [ ] Each game shows copy usage (e.g., "2/5 in use")
- [ ] Games are sorted by utilization percentage
- [ ] Clicking a game navigates to library with bottleneck filter

### Code Reference
- Component: `components/admin/dashboard/BottleneckWidget.tsx`

---

## 10. Refresh Functionality

**Scenario:** Dashboard data updates when refresh is triggered

### Setup
1. Open dashboard in one tab
2. In another tab/window, make changes (start session, update game, submit feedback)

### Verification
- [ ] Click refresh button in dashboard header
- [ ] Refresh button shows spinner animation during refresh
- [ ] "Last updated" timestamp updates to current time
- [ ] Pulse tile counts reflect new data
- [ ] New alerts appear if conditions are met
- [ ] Activity feed shows new entries
- [ ] Bottleneck widget updates if applicable

### Code Reference
- Implementation: `components/admin/DashboardClient.tsx` line ~154
- Uses `useTransition()` + `router.refresh()`

---

## 11. Empty States

**Scenario:** Dashboard shows appropriate messages when no data exists

### Setup
Test with a venue that has:
- No active sessions
- No alerts
- No recent feedback
- No bottlenecks

### Verification

#### No Alerts
- [ ] AlertQueue shows empty state: "No alerts—smooth sailing!" with ⛵ emoji

#### No Bottlenecks
- [ ] BottleneckWidget shows: "No bottlenecks" with celebration emoji

#### No Recent Activity
- [ ] Recently Ended section shows: "No sessions yet today" with hint text
- [ ] Recent Feedback section shows: "No feedback yet" with hint text

#### New Venue (No games AND no tables)
- [ ] Shows onboarding view with welcome message
- [ ] Three onboarding cards displayed:
  - "Add your first game" (primary button, links to `/admin/library?action=add`)
  - "Set up tables" (links to `/admin/settings`)
  - "Print QR codes" (links to `/admin/settings`)

### Code Reference
- Onboarding: `components/admin/DashboardClient.tsx`
- Empty states: Individual component files

---

## 12. Responsive Layout

**Scenario:** Dashboard is usable on mobile devices

### Setup
1. Open dashboard in browser
2. Use DevTools to simulate mobile viewport (e.g., iPhone 12, 390x844)

### Verification
- [ ] Pulse tiles stack appropriately (2x2 or 1x4)
- [ ] Alert queue is full width and scrollable
- [ ] Control deck buttons are accessible
- [ ] Bottleneck widget is visible
- [ ] Activity feed is accessible
- [ ] All text is readable without horizontal scroll
- [ ] Action buttons in alerts are tappable
- [ ] Modals work correctly on mobile
- [ ] Overflow menus open without clipping

### Code Reference
- Layout: `components/admin/DashboardClient.tsx`
- Uses Tailwind responsive classes (e.g., `grid-cols-2 lg:grid-cols-4`)

---

## 13. Control Deck Actions

**Scenario:** Quick action buttons work correctly

### Verification

#### Assign Game Button
- [ ] Shows badge with count of waiting tables (browsing > 15 min)
- [ ] Badge hidden if count is 0
- [ ] Click opens assign game modal
- [ ] Modal shows list of waiting tables

#### Mark for Repair Button
- [ ] Navigates to appropriate repair workflow

#### Print QRs Button
- [ ] Navigates to QR code printing page

#### Add Game Button
- [ ] Navigates to `/admin/library?action=add`

### Code Reference
- Component: `components/admin/dashboard/ControlDeck.tsx`

---

## 14. Alert Severity Ordering

**Scenario:** Alerts are displayed in order of severity

### Setup
Create multiple alerts with different severities

### Verification
- [ ] Within each category (Tables, Maintenance, Experience), alerts are ordered:
  - `high` severity first (red dot)
  - `medium` severity second (orange dot)
  - `low` severity last (gray dot)
- [ ] Categories can be collapsed/expanded
- [ ] Collapsed count shows total alerts in category

### Code Reference
- Component: `components/admin/dashboard/AlertQueue.tsx`

---

## 15. Alert Actions via Overflow Menu

**Scenario:** Additional actions accessible via overflow menu

### Verification
- [ ] Each alert row has an overflow menu (three dots)
- [ ] Clicking opens dropdown with additional actions
- [ ] Menu closes when clicking outside
- [ ] Menu closes on Escape key
- [ ] All menu actions navigate to correct destinations

### Code Reference
- Component: `components/admin/dashboard/AlertRow.tsx`

---

## Test Data Cleanup

After testing, remember to:
- [ ] Reset games to normal conditions
- [ ] End any test sessions
- [ ] Remove test feedback if possible
- [ ] Restore `copies_in_rotation` to original values

---

## Notes

- **Browsing threshold:** 15 minutes (configurable in `lib/data/dashboard.ts`)
- **Stale severity boost:** 20 minutes
- **Large table threshold:** 4+ seats
- **Feedback lookback:** 24 hours
- **Top games lookback:** 7 days for popularity calculation
- **Activity display limit:** 5 items each for sessions and feedback
