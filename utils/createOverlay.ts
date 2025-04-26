import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface OverlayLayout {
  style: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    width?: number | string;
    height?: number | string;
    border?: string;
    borderRadius?: string;
    backgroundColor?: string;
    [key: string]: any;
  };
  content: string;
  url?: string;
}

export interface OverlayData {
  id: number;
  name: string;
  path?: string;
  layout?: OverlayLayout;
}

/**
 * Creates a new overlay in the database with the given layout
 * @param name The name of the overlay
 * @param layout The layout object containing style and content
 * @returns The created overlay data or null if an error occurred
 */
export async function createOverlay(name: string, layout: OverlayLayout) {
  try {
    const { data, error } = await supabase
      .from("overlays")
      .insert({ name, layout })
      .select()
      .single()

    if (error) {
      console.error("Error creating overlay:", error)
      return null
    }

    return data
  } catch (e) {
    console.error("Exception creating overlay:", e)
    return null
  }
}

/**
 * Fetches all overlays from the database
 * @returns Array of overlay data
 */
export async function fetchOverlays(): Promise<OverlayData[]> {
  try {
    const { data, error } = await supabase.from("overlays").select()
    
    if (error) {
      console.error("Error fetching overlays:", error)
      return []
    }
    
    return data || []
  } catch (e) {
    console.error("Exception fetching overlays:", e)
    return []
  }
}

/**
 * Subscribes to changes in the overlays table
 * @param callback Function to call when changes occur
 * @returns An object with an unsubscribe function
 */
export function subscribeToOverlays(callback: (payload: any) => void) {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn("Attempted to subscribe in a non-browser environment")
      return {
        unsubscribe: () => {}
      }
    }
    
    const subscription = supabase
      .channel('overlay-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'overlays'
        },
        (payload) => {
          try {
            callback(payload)
          } catch (e) {
            console.error("Error in subscription callback:", e)
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
      })
    
    return {
      unsubscribe: () => {
        try {
          subscription.unsubscribe()
        } catch (e) {
          console.error("Error unsubscribing:", e)
        }
      }
    }
  } catch (e) {
    console.error("Exception setting up subscription:", e)
    return {
      unsubscribe: () => {}
    }
  }
}

/**
 * Example usage:
 * 
 * const overlayData = {
 *   style: {
 *     top: 150,
 *     left: 300,
 *     width: 200,
 *     border: "1px solid black",
 *     height: 100,
 *     borderRadius: "8px",
 *     backgroundColor: "white"
 *   },
 *   content: "Hello world!"
 * }
 * 
 * createOverlay("test", overlayData)
 */ 