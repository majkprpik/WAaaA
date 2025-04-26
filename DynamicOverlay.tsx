import React, { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Global z-index management to prevent overlays from interfering with each other
// This ensures that only one overlay can be "on top" at a time
let globalOverlayCounter = 10000000;
const getNewTopZIndex = (): number => {
  return ++globalOverlayCounter;
};

interface LayoutProps {
  style: React.CSSProperties;
  content: string;
  id?: number;
  url?: string;
  zIndex?: number;
  onDelete?: () => void;
  onPin?: (isPinned: boolean) => void;
}

const DynamicOverlay: React.FC<LayoutProps> = ({ style, content, id, url, zIndex = 9999999, onDelete, onPin }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [localZIndex, setLocalZIndex] = useState(zIndex)
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(!url || url.trim() === "");
  const [position, setPosition] = useState({
    top: typeof style.top === 'number' ? style.top : 0,
    left: typeof style.left === 'number' ? style.left : 0
  })
  
  // Create refs to store event handler functions to ensure we can clean them up
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  
  // Clean up event listeners when component unmounts or when editing state changes
  useEffect(() => {
    return () => {
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener("mouseup", mouseUpHandlerRef.current);
        mouseUpHandlerRef.current = null;
      }
    };
  }, []);

  // Recalculate dimensions when content or editing state changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  // Calculate appropriate dimensions based on content length
  const calculateDimensions = useCallback(() => {
    // Determine if content is short enough for compact size
    const contentToCheck = isEditing ? editedContent : content;
    const isShortContent = contentToCheck.length < 100;
    
    // Define width based on content (could be more sophisticated with text measurement)
    const width = isShortContent ? Math.max(200, contentToCheck.length * 4) : 300;
    
    // Define minimum height
    const minHeight = isShortContent ? 60 : 100;
    
    return { width, minHeight, isShortContent };
  }, [content, editedContent, isEditing]);
  
  const { width, minHeight, isShortContent } = calculateDimensions();

  // Stop propagation of all events to prevent affecting other components
  const stopAllPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  // Ensure position is fixed for overlays
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    ...style,
    top: position.top,
    left: position.left,
    zIndex: localZIndex,
    cursor: isDragging ? "move" : "default",
    transition: isDragging ? "none" : "box-shadow 0.2s ease",
    boxShadow: isHovered ? "0 6px 12px rgba(0,0,0,0.2)" : style.boxShadow || "0 4px 8px rgba(0,0,0,0.15)",
    pointerEvents: "auto", // Enable pointer events on the overlays
    width: isEditing ? (style.width || width + 40) : (style.width || width), // Make slightly wider in edit mode
    minHeight: isEditing ? (style.minHeight || minHeight + 30) : (style.minHeight || minHeight), // Make slightly taller in edit mode
    padding: isShortContent ? "12px 16px" : "16px",
    fontSize: isShortContent ? "14px" : "16px",
    backgroundColor: style.backgroundColor || "#ffffff", // Ensure background to prevent click-through
    border: style.border || "1px solid #e0e0e0"
  }

  // Bring this overlay to front when interacted with
  const bringToFront = useCallback(() => {
    const newTopZIndex = getNewTopZIndex(); // Get the next highest z-index
    setLocalZIndex(newTopZIndex);
    
    // Immediately update the style of the DOM element to prevent flickering
    if (overlayRef.current) {
      overlayRef.current.style.zIndex = newTopZIndex.toString();
    }
  }, []);

  // Toggle pin state of the overlay
  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const newPinState = !isPinned;
    setIsPinned(newPinState);
    
    if (onPin) {
      onPin(newPinState);
    }
    
    if (id) {
      try {
        // First, get the current overlay data
        const { data: currentData, error: fetchError } = await supabase
          .from("overlays")
          .select("layout")
          .eq("id", id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Update the URL field based on pin state
        const updatedLayout = {
          ...(currentData?.layout || {}),
          url: newPinState ? "" : window.location.href
        };
        
        // Update the overlay in the database using Supabase client
        const { error } = await supabase
          .from("overlays")
          .update({
            layout: updatedLayout
          })
          .eq("id", id);
          
        if (error) {
          throw error;
        }
        
        console.log(`Note ${newPinState ? "pinned" : "unpinned"} successfully`);
      } catch (error) {
        console.error(`Error ${isPinned ? "unpinning" : "pinning"} note:`, error);
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    bringToFront();
    setIsEditing(true);
  }

  // Handle deleting a note
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (!id) return;
    
    // Confirm deletion
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        // Delete the overlay from the database
        const { error } = await supabase
          .from("overlays")
          .delete()
          .eq("id", id);
          
        if (error) {
          throw error;
        }
        
        // Call the onDelete callback if provided
        if (onDelete) {
          onDelete();
        }
        
        console.log("Note deleted successfully");
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  }

  const handleSave = async () => {
    if (id) {
      try {
        console.log("Saving note content and position");
        
        // First, get the current overlay data to ensure we don't lose any properties
        const { data: currentData, error: fetchError } = await supabase
          .from("overlays")
          .select("layout")
          .eq("id", id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Calculate dimensions for content - use editedContent for calculation since we're saving that
        const { width: contentWidth, minHeight: contentMinHeight, isShortContent: isShort } = calculateDimensions();
        
        // Update with merged data to preserve all layout properties
        const updatedLayout = {
          ...(currentData?.layout || {}),
          style: {
            ...(currentData?.layout?.style || {}),
            ...style,
            top: position.top,
            left: position.left,
            width: style.width || contentWidth,
            minHeight: style.minHeight || contentMinHeight
          },
          content: editedContent,
          // Preserve pin state (url empty if pinned, current URL if not)
          url: isPinned ? "" : (currentData?.layout?.url || window.location.href),
          zIndex: localZIndex
        };
        
        // Update the overlay in the database using Supabase client
        const { data, error } = await supabase
          .from("overlays")
          .update({
            layout: updatedLayout
          })
          .eq("id", id)
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        console.log("Note updated:", data);
      } catch (error) {
        console.error("Error updating note:", error);
      }
    }
    
    setIsEditing(false);
  }

  // Clean up any existing handlers
  const cleanupHandlers = () => {
    if (mouseMoveHandlerRef.current) {
      document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      mouseMoveHandlerRef.current = null;
    }
    if (mouseUpHandlerRef.current) {
      document.removeEventListener("mouseup", mouseUpHandlerRef.current);
      mouseUpHandlerRef.current = null;
    }
  };

  // Enable dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;
    
    // Don't initiate drag if clicking on buttons or textarea
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' || 
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).classList.contains('edit-button') || 
      (e.target as HTMLElement).classList.contains('delete-button')
    ) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    // Clean up existing handlers just in case
    cleanupHandlers();
    
    // Set dragging state and bring to front
    setIsDragging(true);
    bringToFront();
    
    // Get initial positions
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = position.left;
    const startTop = position.top;
    
    // Handle mouse move
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Prevent default to avoid selecting text during drag
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Update the position state
      const newPosition = {
        left: startLeft + deltaX,
        top: startTop + deltaY
      };
      
      setPosition(newPosition);
      
      // Directly update DOM for smoother dragging
      if (overlayRef.current) {
        overlayRef.current.style.left = `${newPosition.left}px`;
        overlayRef.current.style.top = `${newPosition.top}px`;
      }
    };
    
    // Handle mouse up
    const handleMouseUp = (mouseUpEvent: MouseEvent) => {
      setIsDragging(false);
      
      // Clean up event listeners
      cleanupHandlers();
      
      // If dragged a significant amount, don't trigger click
      const deltaX = mouseUpEvent.clientX - startX;
      const deltaY = mouseUpEvent.clientY - startY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        // Calculate final position explicitly to avoid async state issues
        const finalPosition = {
          top: startTop + deltaY,
          left: startLeft + deltaX
        };
        
        // Update state and save position
        setPosition(finalPosition);
        savePosition(finalPosition);
      }
    };
    
    // Save mouse handler references to refs so we can remove them later
    mouseMoveHandlerRef.current = handleMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;
    
    // Add event listeners to document to ensure continued tracking even if cursor leaves the element
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  
  // Save only the position (used after dragging)
  const savePosition = async (posToSave = position) => {
    if (id) {
      try {
        console.log("Saving position:", posToSave);
        
        // First, get the current overlay data to ensure we don't lose any properties
        const { data: currentData, error: fetchError } = await supabase
          .from("overlays")
          .select("layout")
          .eq("id", id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Calculate dimensions for content
        const { width: contentWidth, minHeight: contentMinHeight } = calculateDimensions();
        
        // Update with merged data to preserve all layout properties
        const updatedLayout = {
          ...(currentData?.layout || {}),
          style: {
            ...(currentData?.layout?.style || {}),
            ...style,
            top: posToSave.top,
            left: posToSave.left,
            width: style.width || contentWidth,
            minHeight: style.minHeight || contentMinHeight
          },
          content: content,
          // Preserve pin state (url empty if pinned, current URL if not)
          url: isPinned ? "" : (currentData?.layout?.url || window.location.href),
          zIndex: localZIndex
        };
        
        // Update just the position in the database using Supabase client
        const { data, error } = await supabase
          .from("overlays")
          .update({
            layout: updatedLayout
          })
          .eq("id", id);
          
        if (error) {
          throw error;
        }
        
        console.log("Position updated successfully");
      } catch (error) {
        console.error("Error updating position:", error);
      }
    }
  }

  if (isEditing) {
    return (
      <div 
        ref={overlayRef}
        style={{
          ...overlayStyle,
          boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
          position: "relative"
        }}
        onClick={stopAllPropagation}
      >
        {/* Drag handle */}
        <div 
          style={{
            position: "absolute",
            top: "3px",
            left: "3px",
            cursor: "move",
            userSelect: "none",
            width: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#aaa"
          }}
          onMouseDown={handleMouseDown}
          title="Drag to move"
        >
          ⋮⋮
        </div>
        
        {/* Edit buttons - absolute positioned in the top right */}
        <div 
          style={{
            position: "absolute",
            top: "3px",
            right: "3px",
            display: "flex",
            gap: "4px"
          }}
        >
          {/* Pin button */}
          <button
            onClick={handlePinToggle}
            style={{
              backgroundColor: isPinned ? "#4285F4" : "#f5f5f5",
              color: isPinned ? "white" : "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title={isPinned ? "Unpin from all pages" : "Pin to all pages"}
          >
            📌
          </button>
          
          <button
            onClick={(e) => {
              stopAllPropagation(e);
              setIsEditing(false);
            }}
            style={{
              backgroundColor: "#f5f5f5",
              color: "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title="Cancel"
          >
            ✕
          </button>
          <button
            onClick={(e) => {
              stopAllPropagation(e);
              handleSave();
            }}
            style={{
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title="Save"
          >
            ✓
          </button>
          {/* Add delete button in edit mode */}
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px"
            }}
            title="Delete note"
          >
            🗑
          </button>
        </div>
        
        {/* Inline text editor */}
        <textarea
          style={{
            width: "100%",
            minHeight: "calc(100% - 10px)",
            padding: "8px",
            paddingTop: "30px", // Make room for the buttons
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "inherit",
            backgroundColor: "transparent",
            lineHeight: style.lineHeight || "normal"
          }}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onClick={stopAllPropagation}
          autoFocus
        />
        
        {/* URL display (if available) - small at the bottom */}
        {url && (
          <div style={{
            fontSize: "10px",
            color: "#888",
            padding: "2px 8px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            position: "absolute",
            bottom: "2px",
            left: "0",
            right: "0"
          }}>
            {url}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      ref={overlayRef}
      style={{
        ...overlayStyle,
        position: "relative"
      }} 
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => {
        stopAllPropagation(e);
        setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        stopAllPropagation(e);
        setIsHovered(false);
      }}
      onClick={stopAllPropagation}
    >
      {/* Drag handle - only shown when hovered */}
      {isHovered && (
        <div 
          style={{
            position: "absolute",
            top: "3px",
            left: "3px",
            cursor: "move",
            userSelect: "none",
            width: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#aaa"
          }}
          title="Drag to move"
        >
          ⋮⋮
        </div>
      )}

      {/* Control buttons - only shown when hovered */}
      {isHovered && (
        <div style={{
          position: "absolute", 
          top: "3px", 
          right: "3px",
          display: "flex",
          gap: "4px"
        }}>
          {/* Pin button */}
          <button
            onClick={handlePinToggle}
            style={{
              backgroundColor: isPinned ? "#4285F4" : "#f5f5f5",
              color: isPinned ? "white" : "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              zIndex: 1
            }}
            title={isPinned ? "Unpin from all pages" : "Pin to all pages"}
          >
            📌
          </button>
          
          {/* Edit button */}
          <button
            className="edit-button"
            onClick={handleEditClick}
            style={{
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              zIndex: 1
            }}
            title="Edit note"
          >
            ✎
          </button>
          
          {/* Delete button */}
          <button
            className="delete-button"
            onClick={handleDelete}
            style={{
              backgroundColor: "#ff4d4f",
              color: "white",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              zIndex: 1
            }}
            title="Delete note"
          >
            🗑
          </button>
        </div>
      )}
      
      {/* Option 1: Simple text rendering */}
      <div onClick={stopAllPropagation} style={{ pointerEvents: "none" }}>
        {typeof content === 'string' && !content.includes('<') && content}
      
        {/* Option 2: HTML content rendering */}
        {typeof content === 'string' && content.includes('<') && (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </div>
  )
}

/**
 * Create a React element from a layout configuration
 * This can be used to programmatically create overlay elements
 */
export function createOverlayElement(layout: LayoutProps) {
  return React.createElement(DynamicOverlay, layout);
}

export default DynamicOverlay 