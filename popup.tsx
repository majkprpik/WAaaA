import { useState, useEffect } from "react"

import "./global.css"

function IndexPopup() {
  const [username, setUsername] = useState("")
  const [hasUsername, setHasUsername] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  
  // Check if username setup is needed and load existing username if available
  useEffect(() => {
    // Check if we need to prompt for username setup (from background script)
    chrome.runtime.sendMessage({ action: "check_needs_setup" }, (response) => {
      if (response && response.needsSetup) {
        setNeedsSetup(true)
      }
    })
    
    // Try to get existing username
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        setUsername(response.username)
        setHasUsername(true)
        
        // If we have a username and don't need setup, close popup
        if (!needsSetup) {
          window.close()
        }
      }
    })
  }, [needsSetup])

  // Function to save username through the background script
  const saveUsername = () => {
    if (username.trim()) {
      const trimmedUsername = username.trim()
      console.log("Saving username via background:", trimmedUsername)
      
      // Send to background script to save in central storage
      chrome.runtime.sendMessage(
        { action: "set_username", username: trimmedUsername },
        (response) => {
          if (response && response.success) {
            console.log("Username saved successfully")
            setHasUsername(true)
            
            // Close the popup after successful save
            setTimeout(() => window.close(), 500)
          }
        }
      )
    } else {
      alert("Please enter a valid username")
    }
  }
  
  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveUsername()
    }
  }

  return (
    <div
      style={{
        padding: 16,
        width: 300
      }}>
      {!hasUsername && (
        <>
          <h2>Set Your Username</h2>
          <p>
            {needsSetup 
              ? "Welcome! Please set your username to use our overlay features across all sites." 
              : "Please set your username to use our overlay features."}
          </p>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your username"
                autoFocus
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              />
              <button
                onClick={saveUsername}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#34A853",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 14
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
      
      {hasUsername && (
        <>
          <h2>Username Set</h2>
          <p>Your username is set to: <strong>{username}</strong></p>
          <p>You can now close this popup and use the overlay features on any site.</p>
          <button
            onClick={() => window.close()}
            style={{
              padding: "8px 12px",
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
              marginTop: 12
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  )
}

export default IndexPopup
