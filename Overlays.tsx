import React from "react"

const baseStyle: React.CSSProperties = {
  position: "fixed",
  padding: 16,
  color: "white",
  background: "#222",
  borderRadius: 8,
  zIndex: 9999,
  minWidth: 180,
  minHeight: 80,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center"
}

export const OverlayTopLeft = () => (
  <div style={{...baseStyle, top: 16, left: 16}}>
    <h3>Top Left</h3>
    <p>This is the top-left overlay.</p>
  </div>
)

export const OverlayTopRight = () => (
  <div style={{...baseStyle, top: 16, right: 16}}>
    <h3>Top Right</h3>
    <p>This is the top-right overlay.</p>
  </div>
)

export const OverlayBottomLeft = () => (
  <div style={{...baseStyle, bottom: 16, left: 16}}>
    <h3>Bottom Left</h3>
    <p>This is the bottom-left overlay.</p>
  </div>
)

export const OverlayBottomRight = () => (
  <div style={{...baseStyle, bottom: 16, right: 16}}>
    <h3>Bottom Right</h3>
    <p>This is the bottom-right overlay.</p>
  </div>
)
