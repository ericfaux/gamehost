# QA Test Cases: Guest UI Flow (Game Details Checkout)

**Version:** 1.0
**Date:** 2026-01-06
**Feature:** All checkouts routed through Game Details page

---

## Overview

This document contains manual verification test cases for the updated guest UI flow where all game checkouts go through the Game Details page (`/v/[venueSlug]/t/[tableId]/games/[gameId]`).

### Architecture Summary

| Component | File | Purpose |
|-----------|------|---------|
| Table Landing | `app/v/[venueSlug]/t/[tableId]/page.tsx` | Entry point, shows 3 scenarios |
| Game Details | `app/v/[venueSlug]/t/[tableId]/games/[gameId]/page.tsx` | Game info + checkout |
| Wizard | `app/v/[venueSlug]/t/[tableId]/wizard/` | Recommendation engine |
| QuickPickCard | `components/table-app/QuickPickCard.tsx` | Trending/Staff Picks cards |
| GameCard | `components/table-app/GameCard.tsx` | Wizard result cards |

---

## Pre-Test Setup

1. Ensure test venue exists with active tables
2. Ensure game library has games with:
   - Various complexity levels (simple, medium, complex)
   - Various vibes/tags assigned
   - Shelf locations populated
   - Cover images uploaded
3. Clear browser cookies before each test sequence
4. Use mobile viewport (375px width) for realistic testing

---

## Test Suite 1: Path A - Already Have My Game

### TEST-1.1: Start Session and Access Path A

**Precondition:** No active session (cleared cookies)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/v/[venue]/t/[table]` | See "Start Session" button |
| 2 | Click "Start Session" | Page refreshes, shows "Session Active" badge |
| 3 | Verify Path A section | See badge "A" with label "I Already Have My Game" |
| 4 | Verify instruction card | Amber background card with info icon |
| 5 | Verify instruction text | "Grabbed a game from the shelf? Check it out here before you start playing!" |
| 6 | Verify button | "Check Out My Game" button with search icon |

### TEST-1.2: Path A Navigation to Library

**Precondition:** Active session in browsing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Check Out My Game" in Path A | Navigate to `/v/[venue]/t/[table]/library` |
| 2 | Verify library page loads | **BLOCKER: Library page does not exist yet** |

> **CRITICAL ISSUE:** The `/library` route is not implemented. Path A button links to a non-existent page.

### TEST-1.3: Library Search and Game Selection (Future)

**Blocked until library page implemented**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Search for game by name | Results filter as typing |
| 2 | Scroll to find game | Games displayed in scrollable list |
| 3 | Click on game card | Navigate to Game Details page |
| 4 | Verify Game Details shows | See game cover, title, metadata |
| 5 | Verify "Check Out My Game" button | Visible in sticky footer |

---

## Test Suite 2: Path B - Trending Games

### TEST-2.1: Trending Section Display

**Precondition:** Active session in browsing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to table landing in browsing state | See Path B section |
| 2 | Verify section header | "Trending" with orange fire icon |
| 3 | Verify subtitle | "Popular games right now" |
| 4 | Count displayed games | Up to 4 games in 2x2 grid |
| 5 | Verify card contents | Cover image, title, "Xp", "X-Xm", "Play this" button |

### TEST-2.2: Trending Card Navigation to Game Details

**Precondition:** Active session with trending games visible

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Play this" on trending card | Navigate to `/v/[venue]/t/[table]/games/[gameId]` |
| 2 | Verify URL | No wizard query params (pc, tb, ct, vibes) |
| 3 | Verify game cover | Large cover image displayed |
| 4 | Verify title | Game title in header and body |
| 5 | Verify metadata | Player count, time range visible |
| 6 | Verify shelf location | If exists, displayed with pin icon |
| 7 | Verify complexity badge | Green/amber/red badge shown |
| 8 | Verify vibes | Tag chips displayed if game has vibes |

### TEST-2.3: Complete Checkout from Trending

**Precondition:** On Game Details page from trending

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify sticky footer | "Check Out My Game" button visible |
| 2 | Verify helper text | "This registers the game to your table" |
| 3 | Verify shelf location callout | If exists: "Find it at: [location]" above button |
| 4 | Click "Check Out My Game" | Button shows spinner + "Checking out..." |
| 5 | Wait for success | Success state with checkmark + "Session started!" |
| 6 | Verify success message | "Enjoy [Game] at [Table]. Have fun! Redirecting..." |
| 7 | Wait 2 seconds | Auto-redirect to table landing |
| 8 | Verify "Now Playing" state | Cover image, game title, "Now Playing" badge |

---

## Test Suite 3: Path B - Staff Picks

### TEST-3.1: Staff Picks Section Display

**Precondition:** Active session in browsing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to Staff Picks section | Section visible below Trending |
| 2 | Verify section header | "Staff Picks" with yellow star icon |
| 3 | Verify subtitle | "Our team's favorites" |
| 4 | Count displayed games | Up to 4 games in 2x2 grid |
| 5 | Verify no overlap | Games DIFFERENT from Trending section |

### TEST-3.2: Staff Pick Navigation and Checkout

**Precondition:** Active session with staff picks visible

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Play this" on staff pick | Navigate to Game Details page |
| 2 | Complete checkout | Same flow as TEST-2.3 |
| 3 | Verify "Now Playing" | Game from Staff Picks now displayed |

---

## Test Suite 4: Path B - Suggest Me a Game (Wizard)

### TEST-4.1: Wizard Entry Point

**Precondition:** Active session in browsing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate wizard button | Below Staff Picks section |
| 2 | Verify button styling | Purple lightbulb icon, "Suggest Me a Game" text |
| 3 | Verify helper text | "Answer a few questions and we'll find the perfect match" |
| 4 | Click button | Navigate to `/v/[venue]/t/[table]/wizard` |

### TEST-4.2: Wizard Form - Player Selection

**Precondition:** On wizard page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify player question | "How many players?" label |
| 2 | Verify options | 4-button grid: 2, 3, 4, 5+ |
| 3 | Click "3" | Button highlights with accent color |
| 4 | Click "4" | Previous selection deselects, new one selected |

### TEST-4.3: Wizard Form - Time Selection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify time question | "How much time do you have?" |
| 2 | Verify options | 3-button grid: "30-45 min", "1-2 hours", "2+ hours" |
| 3 | Select time bucket | Option highlights |

### TEST-4.4: Wizard Form - Complexity Selection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify complexity question | "How complex can the game be?" |
| 2 | Verify options | 3 large buttons with titles + descriptions |
| 3 | Verify "Keep it simple" | "Easy to learn and play" |
| 4 | Verify "Some strategy" | "A bit of thinking involved" |
| 5 | Verify "Bring it on" | "We don't mind complexity" |
| 6 | Select option | Option highlights |

### TEST-4.5: Wizard Form - Vibe Selection (Optional)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify vibe question | "What vibe are you going for?" with "(optional)" |
| 2 | Verify chips | Light & Silly, Competitive, Co-op, Deep & Thinky, Family Friendly |
| 3 | Click "Competitive" | Chip fills with accent color |
| 4 | Click "Co-op" | Multiple selection allowed |
| 5 | Click "Competitive" again | Chip deselects |

### TEST-4.6: Wizard Form Submission

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Show me games" | Button shows spinner + "Finding games..." |
| 2 | Wait for results | Results section appears |
| 3 | Verify header | "Recommended for you" with count |
| 4 | Verify "Modify" link | Top-right of results |
| 5 | Verify game cards | GameCard components with full details |

### TEST-4.7: Wizard Results - Navigate to Game Details

**Precondition:** Wizard showing results

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate result card | Shows cover, title, metadata, complexity, vibes, pitch |
| 2 | Verify button text | "View & Check Out" with arrow |
| 3 | Click button | Navigate to Game Details page |
| 4 | Verify URL params | `?pc=X&tb=XX-XX&ct=XXXX&vibes=vibe1,vibe2` |

### TEST-4.8: Wizard Params Preserved Through Checkout

**Precondition:** On Game Details from wizard with query params

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify back link | "Back to wizard" in header |
| 2 | Click "Check Out My Game" | Complete checkout |
| 3 | Verify session created | Check database or admin UI |
| 4 | Verify wizard_params stored | Session has player count, time, complexity, vibes |

### TEST-4.9: Wizard - No Matches

**Precondition:** Select restrictive criteria (e.g., 2 players, 2+ hours, complex)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit restrictive search | See "No matches found" |
| 2 | Verify empty state | Sad face icon, message, "Adjust preferences" button |
| 3 | Click "Adjust preferences" | Return to wizard form with selections intact |
| 4 | Modify criteria | Change selections |
| 5 | Resubmit | See updated results |

---

## Test Suite 5: Now Playing State

### TEST-5.1: Now Playing Display

**Precondition:** Session with game checked out

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to table landing | See "Now Playing" state |
| 2 | Verify badge | Green "Now Playing" with pulsing dot |
| 3 | Verify cover image | Game cover in 16:9 aspect |
| 4 | Verify title | Game title in large text |
| 5 | Verify metadata | Player count and time range |
| 6 | Verify "View Rules" button | Blue accent button with book icon |
| 7 | Verify "Find a different game" | Dark primary button |
| 8 | Verify "End Session & Check Out" | Secondary button |

### TEST-5.2: View Rules Navigation

**Precondition:** Now Playing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "View Rules" | Navigate to Game Details page |
| 2 | Verify game info | Full game details displayed |
| 3 | Verify back navigation | Can return to table landing |

### TEST-5.3: Find Different Game Flow

**Precondition:** Now Playing state

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Find a different game" | Navigate to wizard |
| 2 | Complete wizard | Select new game |
| 3 | Check out new game | Success state |
| 4 | Verify table landing | NEW game displayed in Now Playing |
| 5 | Verify old game gone | Previous game no longer shown |

---

## Test Suite 6: Edge Cases

### TEST-6.1: No Trending Games Available

**Setup:** Remove all trending games from database

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start session | Browsing state shown |
| 2 | Verify Trending section | Not displayed (conditional render) |
| 3 | Verify Staff Picks | Still shows if available |
| 4 | Verify fallback | If both empty: "Ready to find the perfect game? Use the wizard below!" |

### TEST-6.2: No Staff Picks Available

**Setup:** Remove all staff picks from database

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start session | Browsing state shown |
| 2 | Verify Staff Picks | Not displayed |
| 3 | Verify Trending | Still shows if available |

### TEST-6.3: No Games at All

**Setup:** Empty game library or all copies in use

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start session | Browsing state shown |
| 2 | Verify both sections empty | Neither Trending nor Staff Picks shown |
| 3 | Verify fallback message | "Ready to find the perfect game? Use the wizard below!" |
| 4 | Wizard still works | Can access via button |

### TEST-6.4: Game Not Found

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/v/[venue]/t/[table]/games/INVALID-ID` | Error page shown |
| 2 | Verify error message | "Game not found" title |
| 3 | Verify description | "The game you are looking for does not exist or has been removed." |
| 4 | Verify back button | "Back to table" link |

### TEST-6.5: Invalid Venue/Table

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/v/INVALID/t/INVALID` | Error page shown |
| 2 | Verify error | "This table link is not valid" |
| 3 | Verify help text | "The QR code you scanned may be outdated..." |
| 4 | Verify home link | "Go to Home" button |

### TEST-6.6: Inactive Table

**Setup:** Set table `is_active = false`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to table | Same error as invalid table |

---

## Test Suite 7: Button Label Consistency

### TEST-7.1: Button Label Audit

| Location | Component | Expected Label | Status |
|----------|-----------|----------------|--------|
| Path A button | Table Landing | "Check Out My Game" | [ ] Verified |
| Game Details CTA | StartSessionButton | "Check Out My Game" | [ ] Verified |
| Game Details loading | StartSessionButton | "Checking out..." | [ ] Verified |
| Game Details success | StartSessionButton | "Session started!" | [ ] Verified |
| Trending card | QuickPickCard | "Play this" | [ ] Verified |
| Staff Picks card | QuickPickCard | "Play this" | [ ] Verified |
| Wizard results card | GameCard | "View & Check Out" | [ ] Verified |
| Wizard submit | WizardForm | "Show me games" | [ ] Verified |
| Wizard loading | WizardForm | "Finding games..." | [ ] Verified |
| Now Playing rules | Table Landing | "View Rules" | [ ] Verified |
| Now Playing switch | Table Landing | "Find a different game" | [ ] Verified |

---

## Test Suite 8: Visual Verification

### TEST-8.1: Path A/B Section Styling

| Element | Expected | Status |
|---------|----------|--------|
| Path A badge | Rounded "A" in accent color bg | [ ] |
| Path A label | "I Already Have My Game" uppercase | [ ] |
| Path A card | Amber-50 bg, amber-200 border | [ ] |
| Path A icon | Info circle in amber | [ ] |
| Path B divider | Horizontal lines with badge between | [ ] |
| Path B badge | Rounded "B" in purple-100 bg | [ ] |
| Path B label | "Need Help Deciding?" uppercase | [ ] |

### TEST-8.2: Section Icons

| Section | Icon | Color | Status |
|---------|------|-------|--------|
| Trending | Fire/flame | Orange-500 | [ ] |
| Staff Picks | Star | Yellow-500 | [ ] |
| Suggest Me a Game | Lightbulb | Purple-500 | [ ] |
| Session Active | Pulsing dot | Green (--color-success) | [ ] |
| Now Playing | Pulsing dot | Green (--color-success) | [ ] |

### TEST-8.3: Complexity Badge Colors

| Complexity | Background | Status |
|------------|------------|--------|
| simple | Green (--color-success area) | [ ] |
| medium | Amber | [ ] |
| complex | Red (--color-danger area) | [ ] |

---

## Known Issues

### CRITICAL: Library Page Missing

**Issue:** Path A "Check Out My Game" button links to `/v/[venue]/t/[table]/library` which does not exist.

**Impact:** Users who already have a game from the shelf cannot register it.

**Workaround:** Users must use wizard to find and checkout their game.

**Status:** Blocked pending `/library` route implementation.

### Minor: Back Link Always Goes to Wizard

**Issue:** Game Details page always shows "Back to wizard" even when accessed from Trending/Staff Picks.

**Location:** `app/v/[venueSlug]/t/[tableId]/games/[gameId]/page.tsx:99`

**Suggested Fix:** Dynamic back link based on referrer or source param.

---

## Test Environment Matrix

| Browser | Viewport | Priority |
|---------|----------|----------|
| Chrome Mobile | 375x812 | P0 |
| Safari iOS | 390x844 | P0 |
| Chrome Desktop | 1440x900 | P1 |
| Firefox | 375x812 | P2 |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
