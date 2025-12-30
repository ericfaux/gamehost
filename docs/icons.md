# Icon System

This project uses a **shimmed icon system** for consistent styling and bundle control.

## Quick Reference

```tsx
// ✅ CORRECT - Always import from @/components/icons
import { Search, Filter, Plus } from "@/components/icons";

// ❌ WRONG - Never import from lucide-react directly
import { Search } from "lucide-react";  // ESLint error + build failure
```

## Why We Shim Icons

1. **Consistent styling**: All icons use the same `strokeWidth`, `fill`, and accessibility attributes
2. **Bundle control**: Only icons we actually use are included in the bundle
3. **Build safety**: Missing icon exports are caught at build time, not runtime

## Adding a New Icon

When you need an icon that's not already exported:

1. **Find the SVG path** from [lucide.dev](https://lucide.dev) or the lucide-react source

2. **Add the export** to `components/icons/lucide-react.tsx`:

```tsx
export function NewIconName(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* Paste SVG children here (path, circle, line, etc.) */}
      <path d="..." />
    </IconBase>
  );
}
```

3. **Import and use it**:

```tsx
import { NewIconName } from "@/components/icons";
```

## Build Verification

The build automatically verifies icons via `scripts/verify-icons.cjs`:

- **Runs on**: `npm run build` (via prebuild hook)
- **Checks**:
  1. No file imports from `"lucide-react"` directly
  2. All imported icon names exist in the shim

### Running Manually

```bash
node scripts/verify-icons.cjs
```

### Fixing Failures

**"Found imports from lucide-react"**
→ Change the import to use `@/components/icons` instead

**"Missing icon: XYZ"**
→ Add the icon export to `components/icons/lucide-react.tsx` following the pattern above

## File Structure

```
components/icons/
├── index.ts           # Public entrypoint (re-exports lucide-react.tsx)
└── lucide-react.tsx   # Icon implementations with consistent styling
```

## ESLint Rule

The `no-restricted-imports` rule prevents importing from `"lucide-react"`:

```
Import icons from '@/components/icons' (shimmed lucide set).
```

This ensures all icon usage goes through our shim.
