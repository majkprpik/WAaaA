import React, { useEffect, useState } from "react"

import { createOverlay, fetchOverlays } from "./utils/createOverlay"
import { calculateNextPosition } from "./utils/overlayPositioning"

const FloatingButton: React.FC = () => {
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [noteUrl, setNoteUrl] = useState("")
  const [notePosition, setNotePosition] = useState({ top: 20, left: 20 })

  // Set default URL to current page when opening editor
  useEffect(() => {
    if (isCreatingNote) {
      setNoteUrl(window.location.href)
    }
  }, [isCreatingNote])

  // Fetch existing overlays to calculate the initial position
  useEffect(() => {
    if (isCreatingNote) {
      fetchOverlays()
        .then((overlays) => {
          const position = calculateNextPosition(overlays)
          setNotePosition(position)
        })
        .catch((error) => {
          console.error("Error fetching overlays for positioning:", error)
          // Use default position in case of error
          setNotePosition({ top: 20, left: 20 })
        })
    }
  }, [isCreatingNote])

  // Style for the floating button
  const buttonStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#4285F4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    zIndex: 999999,
    border: "none",
    pointerEvents: "auto"
  }

  // Calculate editor size based on content
  const getEditorSize = () => {
    const isShortContent = noteContent.length < 100
    return {
      width: isShortContent ? Math.max(250, noteContent.length * 4) : 300,
      minHeight: 200 // Editor always needs more space for editing
    }
  }

  const { width: editorWidth } = getEditorSize()

  // Style for the floating note editor
  const noteEditorStyle: React.CSSProperties = {
    position: "fixed",
    top: notePosition.top,
    left: notePosition.left,
    width: `${editorWidth}px`,
    minHeight: "200px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
    zIndex: 999998,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid #ddd",
    pointerEvents: "auto"
  }

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "150px",
    padding: "16px",
    border: "none",
    outline: "none",
    resize: "vertical",
    fontFamily: "sans-serif",
    fontSize: "14px",
    flex: 1
  }

  const toolbarStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px",
    backgroundColor: "#f5f5f5",
    borderTop: "1px solid #ddd"
  }

  const handleCreateNote = () => {
    setIsCreatingNote(true)
  }

  const handleSaveNote = async () => {
    if (noteContent.trim()) {
      try {
        // Calculate appropriate size based on content length
        const isShortContent = noteContent.length < 100
        const width = isShortContent
          ? Math.max(200, noteContent.length * 4)
          : 300
        const minHeight = isShortContent ? 60 : 100
        const padding = isShortContent ? "12px 16px" : "16px"

        // Define the overlay configuration
        const overlayConfig = {
          style: {
            top: notePosition.top,
            left: notePosition.left,
            width: width,
            minHeight: minHeight,
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            padding: padding,
            border: "1px solid #ddd",
            fontSize: isShortContent ? "14px" : "16px"
          },
          content: noteContent,
          url: noteUrl
        }

        // Save to database
        const result = await createOverlay("Note", overlayConfig)

        if (result) {
          console.log("Note saved successfully:", result)
          // Reset state
          setNoteContent("")
          setNoteUrl("")
          setIsCreatingNote(false)
        } else {
          console.error("Failed to save note")
          alert("Failed to save note. Please try again.")
        }
      } catch (error) {
        console.error("Error saving note:", error)
        alert("Error saving note. Please try again.")
      }
    } else {
      alert("Please enter some text for your note.")
    }
  }

  const handleCancel = () => {
    setNoteContent("")
    setNoteUrl("")
    setIsCreatingNote(false)
  }

  // Enable dragging of the note
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()

    // Get initial positions
    const startX = e.clientX
    const startY = e.clientY
    const startLeft = notePosition.left
    const startTop = notePosition.top

    // Handle mouse move
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      setNotePosition({
        left: startLeft + deltaX,
        top: startTop + deltaY
      })
    }

    // Handle mouse up
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <>
      {/* Floating add button */}
      {!isCreatingNote && (
        <button
          style={buttonStyle}
          onClick={handleCreateNote}
          title="Create new note">
          +
        </button>
      )}

      {/* Note editor */}
      {isCreatingNote && (
        <div style={noteEditorStyle}>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#4285F4",
              color: "white",
              cursor: "move",
              userSelect: "none"
            }}
            onMouseDown={handleMouseDown}>
            New Note
          </div>
          <textarea
            style={textareaStyle}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Enter your note here..."
            autoFocus
            className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded"
          />
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #eee"
            }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                color: "#555"
              }}>
              Show on URL (leave empty for all pages):
            </label>
            <input
              type="text"
              value={noteUrl}
              onChange={(e) => setNoteUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "12px"
              }}
              placeholder="https://example.com/page"
            />
          </div>
          <div style={toolbarStyle}>
            <button
              onClick={handleCancel}
              style={{
                padding: "6px 12px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer"
              }}>
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              style={{
                padding: "6px 12px",
                backgroundColor: "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}>
              Save Note
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default FloatingButton
