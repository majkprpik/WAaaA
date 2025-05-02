import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { createClient } from "@supabase/supabase-js"

// Supabase configuration
const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
const CHANNEL_NAME = "cursor-sharing-channel"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// Debug log
console.log("[Overlay UI] Content script loaded")

// Create overlay container
const OverlayUI: React.FC = () => {
  const [username, setUsername] = useState<string>("")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isSharingCursor, setIsSharingCursor] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState<boolean>(true) // Start expanded for debugging
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [userPages, setUserPages] = useState<{[username: string]: {url: string, pageTitle: string}}>({})
  
  // Get username from background script
  useEffect(() => {
    console.log("[Overlay UI] Component mounted")
    
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        console.log("[Overlay UI] Got username:", response.username)
        setUsername(response.username)
      } else {
        console.log("[Overlay UI] No username received")
      }
    })

    // Check global state
    chrome.runtime.sendMessage({ action: "get_global_state" }, (response) => {
      if (response && response.state) {
        console.log("[Overlay UI] Got global state:", response.state)
        setIsConnected(response.state.isConnected)
        setIsSharingCursor(response.state.isSharingCursor)
      } else {
        console.log("[Overlay UI] No global state received")
      }
    })

    // Listen for global state updates
    const messageListener = (message, sender, sendResponse) => {
      console.log("[Overlay UI] Received message:", message)
      
      if (message.action === "global_state_update" && message.state) {
        setIsConnected(message.state.isConnected)
        setIsSharingCursor(message.state.isSharingCursor)
        sendResponse({ success: true })
      }

      if (message.action === "online_users_update") {
        if (message.users) {
          setOnlineUsers(message.users)
        }
        if (message.userPages) {
          setUserPages(message.userPages)
        }
        sendResponse({ success: true })
      }
      
      if (message.action === "user_page_update" && message.username) {
        setUserPages(prev => ({
          ...prev,
          [message.username]: {
            url: message.url,
            pageTitle: message.pageTitle
          }
        }))
        sendResponse({ success: true })
      }
      
      return true
    }

    chrome.runtime.onMessage.addListener(messageListener)
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  // Toggle connection via popup
  const toggleConnection = () => {
    console.log("[Overlay UI] Toggle connection:", !isConnected)
    chrome.runtime.sendMessage({ 
      action: "toggle_connection",
      value: !isConnected
    })
  }

  // Toggle cursor sharing via popup
  const toggleCursorSharing = () => {
    console.log("[Overlay UI] Toggle cursor sharing:", !isSharingCursor)
    chrome.runtime.sendMessage({ 
      action: "toggle_cursor_sharing",
      value: !isSharingCursor
    })
  }
  
  // Navigate to another user's page
  const navigateToUserPage = (url: string) => {
    if (url) {
      console.log("[Overlay UI] Navigating to:", url)
      window.location.href = url
    }
  }

  // No UI rendered if no username
  if (!username) {
    console.log("[Overlay UI] No username, not rendering UI")
    return null
  }

  return (
    <div 
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        zIndex: 9999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        fontSize: "14px",
        color: "#333",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        borderRadius: "12px",
        overflow: "hidden",
        width: isExpanded ? "300px" : "auto",
        backgroundColor: "white"
      }}
    >
      {/* Collapsed state - only show icon when collapsed */}
      {!isExpanded && (
        <div 
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            backgroundColor: isConnected ? "#3ECF8E" : "#f87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: "bold",
            color: "white",
            fontSize: "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          onClick={() => setIsExpanded(true)}
        >
          {username.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Expanded controls */}
      {isExpanded && (
        <div 
          style={{
            width: "100%",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div style={{ 
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontWeight: "600", fontSize: "14px" }}>
              Hi, {username}!
            </div>
            <div 
              style={{ 
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                color: "#666"
              }}
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </div>
          </div>
          
          {/* Controls */}
          <div style={{ 
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <button 
              style={{
                backgroundColor: isConnected ? "#f87171" : "#3ECF8E",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
              onClick={toggleConnection}
            >
              <span style={{ fontSize: "14px" }}>
                {isConnected ? "🔴" : "🔌"}
              </span>
              {isConnected ? "Disconnect" : "Connect"}
            </button>
            
            {isConnected && (
              <button 
                style={{
                  backgroundColor: isSharingCursor ? "#f87171" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s ease"
                }}
                onClick={toggleCursorSharing}
              >
                <span style={{ fontSize: "14px" }}>🖱️</span>
                {isSharingCursor ? "Stop Sharing Cursor" : "Share Cursor"}
              </button>
            )}
          </div>

          {/* Online users list */}
          {isConnected && onlineUsers.length > 0 && (
            <div style={{ 
              borderTop: "1px solid #f0f0f0",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ 
                fontSize: "13px",
                color: "#333",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span style={{ fontSize: "13px" }}>👥</span>
                {onlineUsers.length} {onlineUsers.length === 1 ? "person" : "people"} online
              </div>
              
              {/* Detailed list of online users with URLs */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "150px",
                overflowY: "auto",
                marginTop: "4px"
              }}>
                {onlineUsers.map((user) => {
                  const pageInfo = userPages[user];
                  const currentUrl = window.location.href;
                  const isOnDifferentPage = pageInfo && pageInfo.url !== currentUrl;
                  
                  return (
                    <div 
                      key={user} 
                      style={{
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "4px",
                        backgroundColor: user === username ? "#f0f9ff" : isOnDifferentPage ? "#fff8f0" : "transparent",
                        margin: "2px 0",
                        fontSize: "12px",
                        cursor: isOnDifferentPage ? "pointer" : "default",
                        transition: "background-color 0.2s ease"
                      }}
                      onClick={() => {
                        if (isOnDifferentPage && pageInfo) {
                          navigateToUserPage(pageInfo.url);
                        }
                      }}
                    >
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: user === username ? "#3b82f6" : isOnDifferentPage ? "#f59e0b" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "10px",
                        flexShrink: 0
                      }}>
                        {user.charAt(0).toUpperCase()}
                      </div>
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {user} {user === username && <span style={{ color: "#6b7280", fontSize: "11px" }}>(You)</span>}
                        </div>
                        <div style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {isOnDifferentPage ? (
                            <>
                              <span style={{ color: "#f59e0b", fontSize: "10px" }}>●</span>
                              {pageInfo ? pageInfo.pageTitle : "Other page"}
                            </>
                          ) : (
                            <>
                              <span style={{ color: "#10b981", fontSize: "10px" }}>●</span>
                              Current page
                            </>
                          )}
                        </div>
                      </div>
                      {isOnDifferentPage && (
                        <div style={{
                          marginLeft: "auto",
                          color: "#6b7280",
                          fontSize: "10px"
                        }}>
                          Go →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Create shadow root and mount app
const container = document.createElement("div")
document.body.appendChild(container)

const root = createRoot(container)
root.render(<OverlayUI />)

export default {} 