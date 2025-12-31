# Release Notes

## 2025-12-31: Main Branch Stability Issue (Resolved)

### Summary

The `main` branch was broken due to a PR sequencing issue. This document explains what happened and the correct resolution.

### Root Cause

| PR | Description | Result |
|----|-------------|--------|
| #73 | Added operator tools / floor plan features | Introduced build failures |
| #75 | Reverted PR #73 | Restored stability (commit `9c1664e`) |
| #76 | Reintroduced operator tools / floor plan | Re-broke main (commit `fdb1af9`) |

PR #75 successfully reverted PR #73 and produced a stable state at commit `9c1664e`. However, PR #76 was merged afterwards and reintroduced the same problematic code, causing the Vercel build to fail again.

### Resolution

The correct fix is to **revert PR #76** to restore `main` to the stable state from PR #75 (commit `9c1664e`).

### Lessons Learned

1. **Check CI status before merging**: Always ensure Vercel checks pass before merging PRs to `main`
2. **Coordinate reverts with pending PRs**: When a revert is merged, any related pending PRs should be updated or closed
3. **Enable branch protection**: Require status checks (especially Vercel) to pass before allowing merges to `main`

### Related PRs

- PR #73: Original operator tools changes (reverted)
- PR #75: Revert of PR #73 (stable baseline)
- PR #76: Re-introduced operator tools (caused failure)
