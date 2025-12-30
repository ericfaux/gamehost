#!/usr/bin/env node

/**
 * Build-time Icon Verifier
 *
 * This script runs before builds to catch icon-related issues early:
 * 1. Ensures no files import from "lucide-react" directly
 * 2. Ensures all imported icon names are actually exported by the shim
 *
 * Run manually: node scripts/verify-icons.cjs
 * Runs automatically: via "prebuild" in package.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SHIM_PATH = path.join(ROOT, "components/icons/lucide-react.tsx");

// Directories to scan for imports
const SCAN_DIRS = ["app", "components", "lib"];

// Files to skip (e.g., the shim itself and the index)
const SKIP_FILES = new Set([
  path.join(ROOT, "components/icons/lucide-react.tsx"),
  path.join(ROOT, "components/icons/index.ts"),
]);

// =============================================================================
// Utilities
// =============================================================================

function getAllFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.some((ext) => item.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// =============================================================================
// Parse exported icon names from the shim
// =============================================================================

function getExportedIconNames() {
  const content = fs.readFileSync(SHIM_PATH, "utf-8");
  const names = new Set();

  // Match: export function IconName
  const funcRegex = /export\s+function\s+(\w+)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  // Match: export const IconName
  const constRegex = /export\s+const\s+(\w+)/g;
  while ((match = constRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  // Match: export type IconName (we'll track these separately but include them)
  const typeRegex = /export\s+type\s+(\w+)/g;
  while ((match = typeRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  return names;
}

// =============================================================================
// Scan files for imports
// =============================================================================

function scanFileForImports(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const result = {
    hasLucideReactImport: false,
    iconImports: [], // { name: string, alias?: string }
  };

  // Check for direct lucide-react imports (banned)
  // Match: from "lucide-react" or from 'lucide-react'
  const lucideImportRegex = /from\s+["']lucide-react["']/g;
  if (lucideImportRegex.test(content)) {
    result.hasLucideReactImport = true;
  }

  // Find imports from @/components/icons
  // Match: import { X, Y as Z } from "@/components/icons"
  // Also match: import { X, Y as Z } from "@/components/icons/..."
  const shimImportRegex =
    /import\s+(?:type\s+)?{([^}]+)}\s+from\s+["']@\/components\/icons(?:\/[^"']*)?["']/g;

  let match;
  while ((match = shimImportRegex.exec(content)) !== null) {
    const importClause = match[0];
    const importContent = match[1];

    // Skip type-only imports
    if (importClause.includes("import type")) {
      continue;
    }

    // Parse individual imports: "X" or "X as Y"
    const parts = importContent.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (!part) continue;

      // Skip inline type imports like "type IconProps"
      if (part.startsWith("type ")) continue;

      const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) {
        result.iconImports.push({ name: asMatch[1], alias: asMatch[2] });
      } else if (/^\w+$/.test(part)) {
        result.iconImports.push({ name: part });
      }
    }
  }

  return result;
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log("🔍 Verifying icon imports...\n");

  const exportedIcons = getExportedIconNames();
  console.log(`   Found ${exportedIcons.size} exported icons in shim\n`);

  const errors = [];
  const lucideReactViolations = [];
  const missingIconsMap = new Map(); // iconName -> [files]

  // Collect all files to scan
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...getAllFiles(path.join(ROOT, dir)));
  }

  // Scan each file
  for (const filePath of allFiles) {
    if (SKIP_FILES.has(filePath)) continue;

    const result = scanFileForImports(filePath);
    const relativePath = path.relative(ROOT, filePath);

    // Check for banned lucide-react imports
    if (result.hasLucideReactImport) {
      lucideReactViolations.push(relativePath);
    }

    // Check for missing icon exports
    for (const { name } of result.iconImports) {
      if (!exportedIcons.has(name)) {
        if (!missingIconsMap.has(name)) {
          missingIconsMap.set(name, []);
        }
        missingIconsMap.get(name).push(relativePath);
      }
    }
  }

  // Report errors
  let hasErrors = false;

  if (lucideReactViolations.length > 0) {
    hasErrors = true;
    console.log("❌ ERROR: Found imports from \"lucide-react\" (banned)\n");
    console.log("   These files must import from \"@/components/icons\" instead:\n");
    for (const file of lucideReactViolations) {
      console.log(`   • ${file}`);
    }
    console.log("");
  }

  if (missingIconsMap.size > 0) {
    hasErrors = true;
    console.log("❌ ERROR: Found imports for icons not exported by the shim\n");
    for (const [iconName, files] of missingIconsMap) {
      console.log(`   Missing: ${iconName}`);
      console.log(`   Used in:`);
      for (const file of files) {
        console.log(`     • ${file}`);
      }
      console.log("");
    }
    console.log("   💡 Fix: Add the missing icon(s) to components/icons/lucide-react.tsx");
    console.log("      See docs/icons.md for instructions.\n");
  }

  if (hasErrors) {
    console.log("❌ Icon verification failed!\n");
    process.exit(1);
  }

  console.log("✅ All icon imports verified successfully!\n");
  process.exit(0);
}

main();
