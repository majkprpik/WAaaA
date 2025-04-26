import React, { useState, useEffect } from "react"
import { createOverlay, fetchOverlays, subscribeToOverlays } from "./utils/createOverlay"
import type { OverlayData } from "./utils/createOverlay"
import { createOverlayElement } from "./DynamicOverlay"

// Example overlay configuration
const exampleOverlay = {
  style: {
    top: 150,
    left: 300,
    width: 200,
    border: "1px solid black",
    height: 100,
    borderRadius: "8px",
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  content: "<h3 style='margin:0;color:#333;'>Hello world!</h3>"
}

const DemoOverlay = () => {
  const [status, setStatus] = useState("")
  const [overlays, setOverlays] = useState<OverlayData[]>([])
  const [lastChange, setLastChange] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Load overlays and subscribe to changes
  useEffect(() => {
    // Reset error state
    setError(null)
    
    // Initial fetch
    const loadData = async () => {
      try {
        const data = await fetchOverlays()
        setOverlays(data)
      } catch (e) {
        console.error("Error loading overlays:", e)
        setError("Failed to load overlays")
      }
    }
    
    loadData()
    
    // Subscribe to changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      subscription = subscribeToOverlays((payload) => {
        console.log("Realtime change:", payload)
        setLastChange(`${payload.eventType} - ${new Date().toLocaleTimeString()}`)
        
        // Refresh data
        loadData()
      })
    } catch (e) {
      console.error("Error setting up subscription:", e)
      setError("Failed to set up real-time updates")
    }
    
    // Cleanup subscription
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
  
  // Method 1: Save to database for persistent display
  const saveToDatabase = async () => {
    setStatus("Saving to database...")
    try {
      const result = await createOverlay("Hello World Overlay", exampleOverlay)
      setStatus(result ? "Saved successfully!" : "Error saving overlay")
    } catch (e) {
      console.error("Error saving overlay:", e)
      setStatus("Error saving overlay")
    }
  }
  
  // Method 2: Create React element directly (for immediate rendering)
  const renderDirectly = () => {
    try {
      // This would be used in a component's JSX
      const element = createOverlayElement(exampleOverlay)
      setStatus("Element created! (Check console)")
      console.log("Created overlay element:", element)
      
      // Example of how you'd use this in a component:
      // return (
      //   <div>
      //     {element}
      //   </div>
      // )
    } catch (e) {
      console.error("Error creating element:", e)
      setStatus("Error creating element")
    }
  }
  
  return (
    <div style={{ padding: 20 }}>
      <h2>Overlay Demo</h2>
      <p>This demo shows two ways to use the overlay system:</p>
      
      {error && (
        <div style={{ marginBottom: 15, padding: 10, backgroundColor: "#ffdddd", borderRadius: 4, color: "#aa0000" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ marginBottom: 20 }}>
        <h3>Method 1: Save to Database</h3>
        <p>Creates a persistent overlay that will be loaded on every page load</p>
        <button onClick={saveToDatabase}>Save Overlay to Database</button>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Method 2: Create Element Directly</h3>
        <p>Creates a React element that can be rendered immediately</p>
        <button onClick={renderDirectly}>Create Overlay Element</button>
      </div>
      
      {status && (
        <div style={{ marginTop: 20, padding: 10, backgroundColor: "#f0f0f0", borderRadius: 4 }}>
          <strong>Status:</strong> {status}
        </div>
      )}
      
      {/* Real-time updates section */}
      <div style={{ marginTop: 30 }}>
        <h3>Real-time Overlay Updates</h3>
        {lastChange && (
          <div style={{ marginBottom: 10, backgroundColor: "#e6f7ff", padding: 8, borderRadius: 4 }}>
            <strong>Last change detected:</strong> {lastChange}
          </div>
        )}
        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>
              <tr>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {overlays.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 8, textAlign: 'center' }}>No overlays found</td>
                </tr>
              )}
              {overlays.map(overlay => (
                <tr key={overlay.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{overlay.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{overlay.name}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                    {overlay.layout ? 'Layout-based' : overlay.path ? 'Path-based' : 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ marginTop: 30 }}>
        <h3>Example Configuration</h3>
        <pre style={{ backgroundColor: "#f5f5f5", padding: 10, borderRadius: 4, overflow: "auto" }}>
          {JSON.stringify(exampleOverlay, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default DemoOverlay 