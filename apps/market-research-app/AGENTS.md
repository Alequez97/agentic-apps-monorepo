# AI Agent Guidelines for Market Research App

## Constants Usage

**Never hardcode status strings or state values. Always use constants from files**

### Rules

1. Import constants at the top of files where needed
2. Use `ANALYSIS_STATUS.COMPLETE` instead of `"complete"`
3. When adding new status values, add them to `constants.js` first
4. For status styling in UI components, use `STATUS_STYLES[status`
