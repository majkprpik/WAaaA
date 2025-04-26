import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State to track visibility
let overlaysVisible = true;

/**
 * Toggle visibility of all overlays
 * If overlays are visible, hide them
 * If overlays are hidden, restore them
 */
export const toggleAllOverlays = (): void => {
  const overlaysContainer = document.getElementById('plasmo-overlays-container');
  const floatingButton = document.querySelector('.floating-button-container') as HTMLElement;
  
  if (!overlaysContainer) {
    console.error("Overlays container not found");
    return;
  }
  
  // Toggle visibility state
  overlaysVisible = !overlaysVisible;
  
  if (!overlaysVisible) {
    // Hide overlays
    overlaysContainer.style.display = 'none';
    
    // Also hide the floating button if it exists
    if (floatingButton) {
      floatingButton.style.display = 'none';
    }
    
    console.log("All overlays hidden (Use Alt+Shift+O to show)");
  } else {
    // Show overlays
    overlaysContainer.style.display = '';
    
    // Show the floating button if it exists
    if (floatingButton) {
      floatingButton.style.display = '';
    }
    
    console.log("All overlays visible (Use Alt+Shift+O to hide)");
  }
};

/**
 * Handle keyboard events
 */
const handleKeyDown = (event: KeyboardEvent): void => {
    console.log("handleKeyDown", event);
  // Alt+Shift+O to hide/show all overlays (O for "Overlays")
  // More specific combination to avoid conflicts with web apps
  if (event.altKey && event.shiftKey && (event.key === 'l' || event.key === 'L')) {
    event.preventDefault();
    toggleAllOverlays();
  }
};

/**
 * Initialize keyboard shortcuts for overlay management
 */
export const initKeyboardShortcuts = (): void => {
  // Make sure we don't add duplicate event listeners
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);
  
  // Show initial instructions with platform-specific info
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? 'Option+Shift+O' : 'Alt+Shift+O';
  console.log(`Keyboard shortcuts initialized: ${shortcutKey} to toggle all overlays`);
}; 