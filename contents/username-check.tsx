import React, { useState, useEffect } from "react"
import { render } from "react-dom"

// Username input overlay component
const UsernameOverlay = () => {
  const [username, setUsername] = useState("")
  const [show, setShow] = useState(false) // Start with not showing

  useEffect(() => {
    // Check if username exists in extension storage via background script
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        // Username exists, don't show the overlay
        setShow(false)
      } else {
        // No username set in extension storage, show the overlay
        setShow(true)
      }
    })

    // Listen for username updates from other tabs/sources
    const messageListener = (message, sender, sendResponse) => {
      if (message.action === "username_updated" && message.username) {
        // Username was set somewhere else, hide this overlay
        setShow(false)
        sendResponse({ success: true })
      }
    }

    // Add listener for messages
    chrome.runtime.onMessage.addListener(messageListener)

    // Clean up listener when component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const saveUsername = () => {
    if (username.trim()) {
      const trimmedUsername = username.trim()
      
      // Save username via background script
      chrome.runtime.sendMessage(
        { action: "set_username", username: trimmedUsername },
        (response) => {
          if (response && response.success) {
            console.log("Username saved via background script:", trimmedUsername)
            setShow(false)
          }
        }
      )
    } else {
      alert("Please enter a valid username")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveUsername()
    }
  }

  if (!show) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999999
      }}
    >
      <div
        style={{
          width: "400px",
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", color: "#333" }}>
          Set Your Username
        </h2>
        <p style={{ margin: "0 0 24px 0", color: "#666" }}>
          Please set your username to use overlay features on all sites
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your username"
            autoFocus
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "16px"
            }}
          />
          <button
            onClick={saveUsername}
            style={{
              padding: "10px 20px",
              backgroundColor: "#34A853",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Create container for the overlay
function init() {
  // Check if a username already exists before creating the overlay
  chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
    if (response && response.username) {
      // Username exists, no need to show the overlay
      console.log("Username already set:", response.username)
      return
    }
    
    // Username doesn't exist, create and show the overlay
    const overlayContainer = document.createElement("div")
    overlayContainer.id = "username-overlay-container"
    document.body.appendChild(overlayContainer)
    
    // Render the username overlay
    render(<UsernameOverlay />, overlayContainer)
  })
}

// Run when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}

export {} 