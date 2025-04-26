import React from "react"

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.3)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
}

const Overlay = () => {
  return (
    <div style={overlayStyle}>
      <div style={{background: "#222", padding: 32, borderRadius: 8}}>
        <h1>Overlay Active</h1>
        <p>This is your always-visible overlay component.</p>
      </div>
    </div>
  )
}

export default Overlay
