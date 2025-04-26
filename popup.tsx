import { useState } from "react"

function IndexPopup() {
  const [data, setData] = useState("")

  // Function to open options page
  const openOverlayManager = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <div
      style={{
        padding: 16,
        width: 300
      }}>
      <h2>Overlay Extension</h2>
      <p>Create and manage custom overlays for any website.</p>
      
      <div style={{ marginTop: 20 }}>
        <button 
          onClick={openOverlayManager}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4285F4",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Open Overlay Manager
        </button>
      </div>
      
      <div style={{ marginTop: 20, fontSize: 14 }}>
        <p>Active overlays will display automatically on websites.</p>
        <a 
          href="https://docs.plasmo.com" 
          target="_blank"
          style={{ color: "#4285F4", textDecoration: "none" }}
        >
          View Docs
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
