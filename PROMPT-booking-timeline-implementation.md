# Booking Timeline Enhancements - Implementation Prompt

Copy and paste the XML block below into Claude Code to execute the implementation.

---

```xml
<task>
  <title>Booking Timeline View Enhancements</title>
  <description>
    Implement four enhancements to the Admin UI Bookings Tab Timeline View:
    1. Remove active sessions (show bookings only)
    2. Improve booking visibility (larger rows and blocks)
    3. Add date picker popover to calendar icon
    4. Add weekly and monthly view modes
  </description>

  <constraints>
    <constraint>Do not break existing drag-to-reschedule functionality</constraint>
    <constraint>Maintain responsive design for tablet+ (1024px breakpoint)</constraint>
    <constraint>Use existing UI components where possible (shadcn/ui patterns)</constraint>
    <constraint>Keep all TypeScript types accurate</constraint>
    <constraint>Preserve the "Now" indicator and conflict visualization</constraint>
  </constraints>

  <phase id="1" name="Remove Sessions and Improve Visibility">
    <goal>Filter out sessions from timeline and increase block/row sizing for better readability</goal>

    <task id="1.1" name="Add session filtering option">
      <file>lib/data/timeline.ts</file>
      <changes>
        <change>
          <location>Line 37-44 (TimelineOptions interface)</location>
          <action>Add new option: `includeSessions?: boolean` with default false</action>
        </change>
        <change>
          <location>Line 413-417 (destructuring options)</location>
          <action>Add `includeSessions = false` to destructured options</action>
        </change>
        <change>
          <location>Line 513-529 (session fetch query)</location>
          <action>Wrap session fetching in conditional: only execute if `includeSessions` is true, otherwise return empty array</action>
        </change>
        <change>
          <location>Line 562-568 (session transformation and combining)</location>
          <action>Only transform and combine sessions if `includeSessions` is true</action>
        </change>
      </changes>
      <expected_result>When includeSessions is false (default), no session blocks appear on timeline</expected_result>
    </task>

    <task id="1.2" name="Increase timeline dimensions">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>Lines 26-28 (constants)</location>
          <action>Update constants:
            - PIXELS_PER_HOUR: 120 → 150
            - ROW_HEIGHT: 48 → 72
            - HEADER_HEIGHT: 32 → 40
          </action>
        </change>
      </changes>
    </task>

    <task id="1.3" name="Increase minimum block width">
      <file>components/admin/bookings/TimelineBlock.tsx</file>
      <changes>
        <change>
          <location>Line 72 (MIN_BLOCK_WIDTH constant)</location>
          <action>Change from 40 to 80</action>
        </change>
        <change>
          <location>Lines 705-730 (block element className)</location>
          <action>Increase text sizes for better readability:
            - Guest name: text-xs → text-sm font-medium
            - Time display: ensure visible
            - Add min-height if needed
          </action>
        </change>
      </changes>
    </task>

    <task id="1.4" name="Adjust table labels for new row height">
      <file>components/admin/bookings/TimelineRow.tsx</file>
      <changes>
        <change>
          <location>TableLabels component (around line 404-447)</location>
          <action>Ensure table label styling works well with 72px row height - may need padding/font adjustments</action>
        </change>
      </changes>
    </task>
  </phase>

  <phase id="2" name="Calendar Date Picker">
    <goal>Make calendar icon functional with a date picker popover</goal>

    <task id="2.1" name="Install calendar component">
      <action>Run: npx shadcn@latest add calendar popover</action>
      <note>This adds react-day-picker and the Calendar + Popover components</note>
    </task>

    <task id="2.2" name="Add date picker to TimelineHeader">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>Line 12 (imports)</location>
          <action>Add imports:
            - import { Calendar as CalendarComponent } from '@/components/ui/calendar'
            - import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
          </action>
        </change>
        <change>
          <location>Lines 171-212 (TimelineHeader component)</location>
          <action>Wrap calendar Button in Popover with CalendarComponent inside PopoverContent. Wire up date selection to call onDateChange.</action>
          <code_example>
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Open calendar">
      <Calendar className="w-4 h-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="end">
    <CalendarComponent
      mode="single"
      selected={date}
      onSelect={(newDate) => newDate && onDateChange(newDate)}
      initialFocus
    />
  </PopoverContent>
</Popover>
```
          </code_example>
        </change>
      </changes>
    </task>
  </phase>

  <phase id="3" name="View Mode Infrastructure">
    <goal>Add view mode state and toggle UI (Day/Week/Month)</goal>

    <task id="3.1" name="Add view mode types">
      <file>lib/data/timeline.ts</file>
      <changes>
        <change>
          <location>After line 52 (after TimeRange interface)</location>
          <action>Add type: `export type TimelineViewMode = 'day' | 'week' | 'month';`</action>
        </change>
      </changes>
    </task>

    <task id="3.2" name="Add view mode state to BookingsPageClient">
      <file>components/admin/bookings/BookingsPageClient.tsx</file>
      <changes>
        <change>
          <location>Imports section</location>
          <action>Import TimelineViewMode from '@/lib/data/timeline'</action>
        </change>
        <change>
          <location>Inside BookingsPageClient component state declarations</location>
          <action>Add: const [timelineViewMode, setTimelineViewMode] = useState&lt;TimelineViewMode&gt;('day')</action>
        </change>
        <change>
          <location>Pass to Timeline component</location>
          <action>Add props: viewMode={timelineViewMode} onViewModeChange={setTimelineViewMode}</action>
        </change>
      </changes>
    </task>

    <task id="3.3" name="Add view mode toggle to TimelineHeader">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>TimelineHeaderProps interface</location>
          <action>Add: viewMode: TimelineViewMode; onViewModeChange: (mode: TimelineViewMode) => void;</action>
        </change>
        <change>
          <location>TimelineHeader component JSX (between Today button and calendar icon)</location>
          <action>Add segmented button group for Day|Week|Month selection</action>
          <code_example>
```tsx
<div className="flex items-center border rounded-md overflow-hidden">
  {(['day', 'week', 'month'] as const).map((mode) => (
    <Button
      key={mode}
      variant={viewMode === mode ? 'secondary' : 'ghost'}
      size="sm"
      className="rounded-none border-0"
      onClick={() => onViewModeChange(mode)}
    >
      {mode.charAt(0).toUpperCase() + mode.slice(1)}
    </Button>
  ))}
</div>
```
          </code_example>
        </change>
      </changes>
    </task>

    <task id="3.4" name="Update Timeline props">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>TimelineProps interface (lines 34-43)</location>
          <action>Add: viewMode?: TimelineViewMode; onViewModeChange?: (mode: TimelineViewMode) => void;</action>
        </change>
        <change>
          <location>Main Timeline component</location>
          <action>Destructure viewMode and onViewModeChange from props, default viewMode to 'day'</action>
        </change>
        <change>
          <location>TimelineHeader usage</location>
          <action>Pass viewMode and onViewModeChange to TimelineHeader</action>
        </change>
      </changes>
    </task>
  </phase>

  <phase id="4" name="Weekly View">
    <goal>Create a 7-day weekly view showing booking summaries per table per day</goal>

    <task id="4.1" name="Create weekly data fetching function">
      <file>lib/data/timeline.ts</file>
      <changes>
        <change>
          <location>After getTimelineData function (around line 620)</location>
          <action>Add new function getWeeklyTimelineData</action>
          <specification>
            - Takes venueId, weekStartDate (Monday), options
            - Fetches all bookings for the 7-day range in single query
            - Returns: WeeklyTimelineData { tables: WeeklyTable[], weekStart: Date }
            - WeeklyTable: { id, label, capacity, zone, days: { [date: string]: { bookingCount: number, blocks: TimelineBlock[] } } }
          </specification>
        </change>
      </changes>
    </task>

    <task id="4.2" name="Create server action for weekly data">
      <file>app/actions/timeline.ts</file>
      <changes>
        <change>
          <location>After fetchTimelineData function</location>
          <action>Add fetchWeeklyTimelineData server action that calls getWeeklyTimelineData</action>
        </change>
      </changes>
    </task>

    <task id="4.3" name="Create WeeklyTimeline component">
      <file>components/admin/bookings/WeeklyTimeline.tsx</file>
      <action>Create new file</action>
      <specification>
        - Grid layout: rows = tables, columns = 7 days (Mon-Sun)
        - Column headers show day name + date
        - Each cell shows booking count and colored indicators
        - Click on cell to drill down to that day's view
        - Highlight today's column
        - Show table labels on left (reuse TableLabels pattern)
        - Navigation: week backward/forward with arrows
      </specification>
      <layout>
```
┌──────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ Tables   │ Mon 13 │ Tue 14 │ Wed 15 │ Thu 16 │ Fri 17 │ Sat 18 │ Sun 19 │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ Booth 1  │   2    │   -    │   1    │   3    │   5    │   4    │   2    │
│ Table 1  │   -    │   1    │   -    │   2    │   3    │   2    │   1    │
│ Table 2  │   1    │   -    │   2    │   1    │   4    │   3    │   -    │
└──────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```
      </layout>
    </task>

    <task id="4.4" name="Integrate WeeklyTimeline into Timeline component">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>Main Timeline component render</location>
          <action>Conditionally render WeeklyTimeline when viewMode === 'week', otherwise render existing day view</action>
        </change>
      </changes>
    </task>
  </phase>

  <phase id="5" name="Monthly View">
    <goal>Create a traditional calendar month view with booking counts per day</goal>

    <task id="5.1" name="Create monthly data fetching function">
      <file>lib/data/timeline.ts</file>
      <changes>
        <change>
          <location>After getWeeklyTimelineData function</location>
          <action>Add new function getMonthlyTimelineData</action>
          <specification>
            - Takes venueId, year, month, options
            - Fetches all bookings for the month in single query
            - Returns: MonthlyTimelineData { days: { [date: string]: { totalBookings: number, confirmedCount: number, pendingCount: number } }, month: number, year: number }
            - Aggregates booking counts per day across all tables
          </specification>
        </change>
      </changes>
    </task>

    <task id="5.2" name="Create server action for monthly data">
      <file>app/actions/timeline.ts</file>
      <changes>
        <change>
          <location>After fetchWeeklyTimelineData function</location>
          <action>Add fetchMonthlyTimelineData server action</action>
        </change>
      </changes>
    </task>

    <task id="5.3" name="Create MonthlyTimeline component">
      <file>components/admin/bookings/MonthlyTimeline.tsx</file>
      <action>Create new file</action>
      <specification>
        - Standard calendar grid (7 columns for days of week, 5-6 rows for weeks)
        - Header row: Sun Mon Tue Wed Thu Fri Sat
        - Each day cell shows:
          - Day number
          - Total booking count (colored badge)
          - Color intensity based on how busy (light = few, dark = many)
        - Click on day to drill down to day view
        - Highlight today
        - Gray out days from prev/next month
        - Navigation: month backward/forward with arrows
        - Month/Year title in header
      </specification>
      <layout>
```
┌─────────────────────── January 2026 ───────────────────────┐
│  Sun  │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │  Sat  │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│  (29) │  (30) │  (31) │   1   │   2   │   3   │   4   │
│       │       │       │  [3]  │  [5]  │  [8]  │  [12] │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│   5   │   6   │   7   │   8   │   9   │  10   │  11   │
│  [2]  │  [4]  │  [3]  │  [6]  │  [7]  │  [9]  │  [11] │
...
```
      </layout>
    </task>

    <task id="5.4" name="Integrate MonthlyTimeline into Timeline component">
      <file>components/admin/bookings/Timeline.tsx</file>
      <changes>
        <change>
          <location>Main Timeline component render (after WeeklyTimeline integration)</location>
          <action>Conditionally render MonthlyTimeline when viewMode === 'month'</action>
        </change>
      </changes>
    </task>
  </phase>

  <files_summary>
    <modify>
      <file path="lib/data/timeline.ts">Add includeSessions option, weekly/monthly data functions, TimelineViewMode type</file>
      <file path="app/actions/timeline.ts">Add weekly and monthly server actions</file>
      <file path="components/admin/bookings/Timeline.tsx">Update constants, add date picker, view mode toggle, conditional rendering</file>
      <file path="components/admin/bookings/TimelineBlock.tsx">Increase MIN_BLOCK_WIDTH, improve text sizing</file>
      <file path="components/admin/bookings/TimelineRow.tsx">Adjust for new row height</file>
      <file path="components/admin/bookings/BookingsPageClient.tsx">Add viewMode state management</file>
    </modify>
    <create>
      <file path="components/ui/calendar.tsx">Via shadcn CLI</file>
      <file path="components/ui/popover.tsx">Via shadcn CLI</file>
      <file path="components/admin/bookings/WeeklyTimeline.tsx">New weekly view component</file>
      <file path="components/admin/bookings/MonthlyTimeline.tsx">New monthly view component</file>
    </create>
  </files_summary>

  <testing>
    <test>Navigate to Admin > Bookings tab and verify only bookings appear (no sessions)</test>
    <test>Verify booking blocks are larger and more readable</test>
    <test>Click calendar icon and verify date picker popover appears</test>
    <test>Select a date from picker and verify timeline updates</test>
    <test>Click Day/Week/Month buttons and verify view switches</test>
    <test>In Week view, verify 7-day grid with booking counts</test>
    <test>In Month view, verify calendar grid with daily booking counts</test>
    <test>Click on a day in Week/Month view and verify drill-down to Day view</test>
    <test>Verify drag-to-reschedule still works in Day view</test>
    <test>Verify Now indicator still shows in Day view</test>
  </testing>

  <execution_order>
    <step>1. Run shadcn CLI to add calendar and popover components</step>
    <step>2. Implement Phase 1 (session filtering + visibility improvements)</step>
    <step>3. Implement Phase 2 (date picker popover)</step>
    <step>4. Implement Phase 3 (view mode infrastructure)</step>
    <step>5. Implement Phase 4 (weekly view)</step>
    <step>6. Implement Phase 5 (monthly view)</step>
    <step>7. Test all functionality</step>
  </execution_order>
</task>
```

---

## Usage

Copy the XML block above and paste it as a prompt to Claude Code. The structured format provides:

- **Clear phases** with dependencies
- **Exact file paths** and line numbers
- **Code examples** where helpful
- **Layout wireframes** for new components
- **Testing checklist** for verification
- **Execution order** for implementation sequence
