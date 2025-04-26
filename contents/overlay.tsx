import { createClient } from "@supabase/supabase-js"
import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"

import {
  OverlayBottomLeft,
  OverlayBottomRight,
  OverlayTopLeft,
  OverlayTopRight
} from "../Overlays"
import DynamicOverlay from "../DynamicOverlay"
import FloatingButton from "../FloatingButton"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Create container safely
let container: HTMLDivElement | null = null;
try {
  if (typeof document !== 'undefined') {
    // Check if container already exists to prevent double initialization
    const existingContainer = document.getElementById("plasmo-overlays-container");
    
    if (existingContainer) {
      container = existingContainer as HTMLDivElement;
      console.log("Using existing overlay container");
    } else {
      container = document.createElement("div");
      container.id = "plasmo-overlays-container";
      
      // Apply styles to allow click-through by default
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.pointerEvents = "none"; // This allows clicks to pass through
      container.style.zIndex = "9999";
      
      document.body.appendChild(container);
      console.log("Created new overlay container");
    }
  }
} catch (error) {
  console.error("Error creating container:", error);
}

interface OverlayData {
  id: number;
  name: string;
  path?: string;
  layout?: {
    style: React.CSSProperties;
    content: string;
    url?: string;
  };
}

// Define the OverlayRoot component
const OverlayRoot = () => {
  const [dynamicOverlays, setDynamicOverlays] = useState<React.ReactNode[]>([])
  const [layoutOverlays, setLayoutOverlays] = useState<OverlayData[]>([])
  const [currentUrl, setCurrentUrl] = useState("")

  // Set current URL when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  // Function to check if an overlay should be displayed on the current URL
  const shouldShowOverlay = (overlay: OverlayData): boolean => {
    // If no URL is specified for the overlay, show it on all pages
    if (!overlay.layout?.url) {
      return true
    }

    // If URL is specified, check if current URL matches or starts with it
    const overlayUrl = overlay.layout.url.trim()
    return overlayUrl === "" || 
           currentUrl === overlayUrl || 
           currentUrl.startsWith(overlayUrl) ||
           // Support for basic wildcard matching (e.g., "example.com/*")
           (overlayUrl.endsWith('*') && currentUrl.startsWith(overlayUrl.slice(0, -1)))
  }

  // Function to fetch overlays from Supabase
  const fetchOverlays = async () => {
    try {
      const { data, error } = await supabase.from("overlays").select()
      if (error) {
        console.error("Error fetching overlays:", error)
        return
      }
      
      console.log("Fetched overlays:", data)
      
      // Filter overlays with layout data
      const layoutBased = data.filter(overlay => overlay.layout && Object.keys(overlay.layout).length > 0)
      setLayoutOverlays(layoutBased)
      
      // Handle path-based module loading
      const pathBased = data.filter(overlay => overlay.path)
      const loaded = await Promise.all(
        pathBased.map(async (overlay) => {
          try {
            console.log("Loading path-based overlay:", overlay)
            const mod = await import(/* @vite-ignore */ overlay.path)
            return mod.default ? React.createElement(mod.default) : null
          } catch (error) {
            console.error(`Error loading overlay from path ${overlay.path}:`, error)
            return null
          }
        })
      )
      setDynamicOverlays(loaded.filter(Boolean))
    } catch (e) {
      console.error("Error in fetchOverlays:", e)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchOverlays()
    
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      // Subscribe to changes in the overlays table
      subscription = supabase
        .channel('table-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'overlays'
          },
          (payload) => {
            console.log('Change received:', payload)
            // Refetch overlays when any change happens
            fetchOverlays()
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status)
        })
    } catch (error) {
      console.error("Error setting up real-time subscription:", error)
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch (e) {
          console.error("Error unsubscribing:", e)
        }
      }
    }
  }, [])

  return (
    <>
      {/* Add the floating button for creating new notes */}
      <FloatingButton />
      
      {/* <OverlayTopLeft />
      <OverlayTopRight />
      <OverlayBottomLeft />
      <OverlayBottomRight /> */}
      
      {/* Render dynamic modules */}
      {dynamicOverlays.map((Comp, i) => (
        <React.Fragment key={`dynamic-${i}`}>{Comp}</React.Fragment>
      ))}
      
      {/* Render layout-based overlays that match the current URL */}
      {layoutOverlays
        .filter(shouldShowOverlay)
        .map((overlay) => (
          <DynamicOverlay 
            key={`layout-${overlay.id}`}
            id={overlay.id}
            style={overlay.layout?.style || {}} 
            content={overlay.layout?.content || ''}
            url={overlay.layout?.url || ''}
          />
        ))}
    </>
  )
}

// Export as default for use as a content script
export default OverlayRoot;

// Handle rendering for content script
function initContentScript() {
  if (typeof window !== 'undefined' && container) {
    try {
      // Check if there's already a React root rendering to this container
      if (!(container as any).__reactRoot) {
        console.log("Initializing overlay content script");
        const root = ReactDOM.createRoot(container);
        // Store the root on the container to prevent duplicate initialization
        (container as any).__reactRoot = root;
        root.render(<OverlayRoot />);
      } else {
        console.log("Overlay content script already initialized");
      }
    } catch (error) {
      console.error("Error rendering overlay root:", error);
    }
  }
}

// In Plasmo, the content script module's default export will be rendered automatically
// DO NOT auto-execute the script
// initContentScript();
