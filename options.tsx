import React from "react"
import DemoOverlay from "./DemoOverlay"

function OptionsPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Overlay Manager</h1>
      <p>Use this interface to create and manage overlays for your extension.</p>
      <hr style={{ margin: "20px 0" }} />
      <DemoOverlay />
    </div>
  )
}

export default OptionsPage 