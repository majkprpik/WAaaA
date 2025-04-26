# Username Management System Guide

This document explains how the username system works in the extension and how to test it.

## How It Works

The username management system uses the following architecture:

1. **Centralized Storage**: Username is stored in the extension's storage via `@plasmohq/storage`
   - This storage is accessible across all domains
   - Only needs to be set once for the entire extension

2. **Background Script** (`background.ts`):
   - Manages the centralized username storage
   - Handles messaging between different parts of the extension
   - Broadcasts username changes to all open tabs

3. **Content Script** (`contents/username-check.tsx`):
   - Checks if a username exists in the extension storage
   - Shows a username prompt only if no username is set
   - Listens for username updates from other tabs/sources

4. **Popup** (`popup.tsx`):
   - Provides a UI for setting/updating username
   - Opens automatically on first install
   - Communicates with background script

## Common Issues

1. **Username prompt appears on every domain**:
   - This indicates the content script is not using the centralized storage
   - Fix: Make sure `contents/username-check.tsx` is using `chrome.runtime.sendMessage` instead of `localStorage`

2. **Username doesn't persist across domains**:
   - This indicates a problem with the background script or storage
   - Fix: Ensure background script is registered correctly and the storage package is installed

## How to Test

1. **First-time Installation**:
   - Uninstall the extension completely
   - Install it again - you should see the popup open automatically
   - Enter a username in the popup - it should save and close

2. **Multiple Domains Test**:
   - Open several different domains in different tabs
   - Verify that the username prompt doesn't appear on any of them
   - If it does appear, something is wrong with the content script

3. **Username Update Test**:
   - Click the extension icon to open the popup
   - Update your username
   - Open new tabs and verify the new username is used

## Troubleshooting

If you're still seeing username prompts on every domain:

1. Check browser console for errors
2. Verify the extension storage is working by opening a new tab and running:
   ```javascript
   chrome.runtime.sendMessage({action: "get_username"}, console.log)
   ```
3. Check if content scripts can communicate with the background script
4. Rebuild and reinstall the extension

## Technical Details

The username is accessed through message passing:

- Get username: `chrome.runtime.sendMessage({action: "get_username"}, callback)`
- Set username: `chrome.runtime.sendMessage({action: "set_username", username: "value"}, callback)`

This ensures all components use the same centralized storage mechanism. 