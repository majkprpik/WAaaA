import { createClient } from "@supabase/supabase-js"
import cssText from "data-text:~global.css"
import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"

import FloatingButton from "../FloatingButton"
import OverlayFactory from "../components/OverlayFactory"
import type { OverlayData, OverlayLayout } from "../utils/createOverlay"
import { initKeyboardShortcuts } from "../utils/keyboardShortcuts"
import PersistentAIChat from "../components/PersistentAIChat"

// const SUPABASE_URL = "http://127.0.0.1:54321"
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"


const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
  
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// Create container safely
let container: HTMLDivElement | null = null
try {
  if (typeof document !== "undefined") {
    // Check if container already exists to prevent double initialization
    const existingContainer = document.getElementById(
      "plasmo-overlays-container"
    )

    if (existingContainer) {
      container = existingContainer as HTMLDivElement
      console.log("Using existing overlay container")
    } else {
      container = document.createElement("div")
      container.id = "plasmo-overlays-container"

      // Apply styles to allow click-through by default
      container.style.position = "fixed"
      container.style.top = "0"
      container.style.left = "0"
      container.style.width = "100%"
      container.style.height = "100%"
      container.style.pointerEvents = "none" // This allows clicks to pass through
      container.style.zIndex = "9999"

      document.body.appendChild(container)
      console.log("Created new overlay container")
    }
  }
} catch (error) {
  console.error("Error creating container:", error)
}

// Define the OverlayRoot component
const OverlayRoot = () => {
  const [dynamicOverlays, setDynamicOverlays] = useState<React.ReactNode[]>([])
  const [layoutOverlays, setLayoutOverlays] = useState<OverlayData[]>([])
  const [currentUrl, setCurrentUrl] = useState("")

  // Set current URL when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
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
    return (
      overlayUrl === "" ||
      currentUrl === overlayUrl ||
      currentUrl.startsWith(overlayUrl) ||
      // Support for basic wildcard matching (e.g., "example.com/*")
      (overlayUrl.endsWith("*") &&
        currentUrl.startsWith(overlayUrl.slice(0, -1)))
    )
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

      // Get current username from background script
      let currentUsername = "anonymous";
      try {
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
            resolve(response);
          });
        });
        
        if (response && response.username) {
          currentUsername = response.username;
        }
      } catch (error) {
        console.error("Error getting username from background:", error);
        // Fallback to localStorage only as a backup
        currentUsername = localStorage.getItem("overlay_username") || "anonymous";
      }
      
      console.log("Current username for overlay filtering:", currentUsername);
      
      // Filter overlays that are shared with the current user
      // This checks if the users field contains the current username (either exact match or as part of a semicolon-separated list)
      const userFiltered = data.filter(overlay => {
        // If no users field, don't show the overlay
        if (!overlay.users) {
          console.log(`Overlay ${overlay.id} has no users field, skipping`);
          return false;
        }
        
        // Split the users field by semicolon and check if the current username is included
        const usersList = overlay.users.split(";").map(u => u.trim());
        
        // Check for direct match with current username
        let isSharedWithUser = usersList.includes(currentUsername);
        
        // Handle legacy format (User1, User2, User3) mapping
        if (!isSharedWithUser) {
          // Map current username to legacy format
          const legacyMapping: Record<string, string> = {
            'vedran': 'User1',
            'bruno': 'User2',
            'marko': 'User3'
          };
          
          // Map legacy format to current username
          const modernMapping: Record<string, string> = {
            'User1': 'vedran',
            'User2': 'bruno',
            'User3': 'marko'
          };
          
          // Check if the username in legacy format is included
          if (legacyMapping[currentUsername] && usersList.includes(legacyMapping[currentUsername])) {
            isSharedWithUser = true;
          }
          
          // Or check if a legacy username in the list maps to the current username
          for (const user of usersList) {
            if (modernMapping[user] === currentUsername) {
              isSharedWithUser = true;
              break;
            }
          }
        }
        
        // Debug log for each overlay with expanded info
        console.log(`Overlay ${overlay.id} - users: ${overlay.users}, includes ${currentUsername}? ${isSharedWithUser}`);
        
        return isSharedWithUser;
      });
      
      console.log("Overlays filtered by username:", userFiltered);

      // Filter overlays with layout data from the user-filtered list
      const layoutBased = userFiltered.filter(
        (overlay) => overlay.layout && Object.keys(overlay.layout).length > 0
      )
      setLayoutOverlays(layoutBased)

      // Handle path-based module loading - also filter by user
      const pathBased = userFiltered.filter((overlay) => overlay.path)
      const loaded = await Promise.all(
        pathBased.map(async (overlay) => {
          try {
            console.log("Loading path-based overlay:", overlay)
            const mod = await import(/* @vite-ignore */ overlay.path)
            return mod.default ? React.createElement(mod.default) : null
          } catch (error) {
            console.error(
              `Error loading overlay from path ${overlay.path}:`,
              error
            )
            return null
          }
        })
      )
      setDynamicOverlays(loaded.filter(Boolean))
    } catch (e) {
      console.error("Error in fetchOverlays:", e)
    }
  }

  // Handle the deletion of an overlay
  const handleOverlayDelete = (id: number) => {
    console.log(`Overlay ${id} was deleted, updating list`);
    // Remove from local state immediately for a smoother UX
    setLayoutOverlays(prevOverlays => prevOverlays.filter(overlay => overlay.id !== id));
    // The database change will trigger a refresh via subscription
  };
  
  // Handle pinning/unpinning an overlay
  const handleOverlayPin = (id: number, isPinned: boolean) => {
    console.log(`Overlay ${id} was ${isPinned ? 'pinned' : 'unpinned'}`);
    
    // Update the local state for immediate visual feedback
    setLayoutOverlays(prevOverlays => 
      prevOverlays.map(overlay => 
        overlay.id === id 
          ? {
              ...overlay,
              layout: {
                ...overlay.layout,
                url: isPinned ? "" : window.location.href
              }
            }
          : overlay
      )
    );
    // The rest will be handled by database subscription
  };
  
  useEffect(() => {
    // Initial fetch
    fetchOverlays()
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts()
    
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      // Subscribe to changes in the overlays table
      subscription = supabase
        .channel("table-changes")
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "overlays"
          },
          (payload) => {
            console.log("Change received:", payload)
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
      {/* Add persistent AI Chat in bottom-right corner */}
      <div style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 10000000,
        width: "400px",
        height: "400px",
        pointerEvents: "auto"
      }}>
       <PersistentAIChat />
      </div>
      
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
          <div 
            key={`overlay-container-${overlay.id}`} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              height: 0, 
              width: 0, 
              overflow: 'visible',
            }}
          >
            <OverlayFactory 
              overlay={overlay}
              onDelete={handleOverlayDelete}
              onPin={handleOverlayPin}
            />
          </div>
        ))}
    </>
  )
}

// Export as default for use as a content script
export default OverlayRoot

// Handle rendering for content script
function initContentScript() {
  if (typeof window !== "undefined" && container) {
    try {
      // Check if there's already a React root rendering to this container
      if (!(container as any).__reactRoot) {
        console.log("Initializing overlay content script")
        const root = ReactDOM.createRoot(container)
        // Store the root on the container to prevent duplicate initialization
        ;(container as any).__reactRoot = root
        root.render(<OverlayRoot />)
      } else {
        console.log("Overlay content script already initialized")
      }
    } catch (error) {
      console.error("Error rendering overlay root:", error)
    }
  }
}

// In Plasmo, the content script module's default export will be rendered automatically
// DO NOT auto-execute the script
// initContentScript();
