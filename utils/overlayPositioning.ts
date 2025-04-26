import type { OverlayData } from "./createOverlay";

// Constants for positioning
const INITIAL_TOP = 20;
const INITIAL_LEFT = 20;
const OVERLAY_WIDTH = 300;
const OVERLAY_HEIGHT = 200;
const MARGIN = 20;

// Represents a position on the grid
interface Position {
  top: number;
  left: number;
}

// Get the current window width safely for both browser and non-browser environments
function getWindowWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1200;
}

// Calculate maximum number of items that can fit in a row
function getMaxItemsInRow(): number {
  const windowWidth = getWindowWidth();
  // Leave some margin on the right side of the window
  const usableWidth = windowWidth - INITIAL_LEFT - MARGIN;
  return Math.max(1, Math.floor(usableWidth / (OVERLAY_WIDTH + MARGIN)));
}

// Calculate the position for a new overlay
export function calculateNextPosition(existingOverlays: OverlayData[]): Position {
  if (!existingOverlays || existingOverlays.length === 0) {
    // First overlay goes to the initial position
    return { top: INITIAL_TOP, left: INITIAL_LEFT };
  }

  // Get positions of all existing overlays
  const positions = existingOverlays
    .filter(overlay => overlay.layout?.style)
    .map(overlay => ({
      top: typeof overlay.layout?.style.top === 'number' ? overlay.layout.style.top : 0,
      left: typeof overlay.layout?.style.left === 'number' ? overlay.layout.style.left : 0,
    }));

  // Calculate how many items can fit in a row
  const maxInRow = getMaxItemsInRow();

  // Initialize with the default position
  let nextPosition = { top: INITIAL_TOP, left: INITIAL_LEFT };

  // Find rows and determine the next position
  const rows: Position[][] = [];
  
  // Group positions into rows
  positions.forEach(pos => {
    const rowIndex = Math.floor((pos.top - INITIAL_TOP) / (OVERLAY_HEIGHT + MARGIN));
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(pos);
  });

  // If there are no rows yet, or the last row is full, create a new row
  if (rows.length === 0 || rows[rows.length - 1].length >= maxInRow) {
    nextPosition = {
      top: INITIAL_TOP + rows.length * (OVERLAY_HEIGHT + MARGIN),
      left: INITIAL_LEFT
    };
  } else {
    // Add to the last row
    const lastRow = rows[rows.length - 1];
    nextPosition = {
      top: INITIAL_TOP + (rows.length - 1) * (OVERLAY_HEIGHT + MARGIN),
      left: INITIAL_LEFT + lastRow.length * (OVERLAY_WIDTH + MARGIN)
    };
  }

  return nextPosition;
} 