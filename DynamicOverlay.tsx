import React, { useState } from "react"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface LayoutProps {
  style: React.CSSProperties;
  content: string;
  id?: number;
  url?: string;
}

const DynamicOverlay: React.FC<LayoutProps> = ({ style, content, id, url }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({
    top: typeof style.top === 'number' ? style.top : 0,
    left: typeof style.left === 'number' ? style.left : 0
  })

  // Calculate appropriate dimensions based on content length
  const calculateDimensions = () => {
    // Determine if content is short enough for compact size
    const isShortContent = content.length < 100;
    
    // Define width based on content (could be more sophisticated with text measurement)
    const width = isShortContent ? Math.max(200, content.length * 4) : 300;
    
    // Define minimum height
    const minHeight = isShortContent ? 60 : 100;
    
    return { width, minHeight, isShortContent };
  };
  
  const { width, minHeight, isShortContent } = calculateDimensions();

  // Ensure position is fixed for overlays
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    ...style,
    top: position.top,
    left: position.left,
    zIndex: 9999999,
    cursor: isDragging ? "move" : "default",
    transition: isDragging ? "none" : "box-shadow 0.2s ease",
    boxShadow: isHovered ? "0 6px 12px rgba(0,0,0,0.2)" : style.boxShadow || "0 4px 8px rgba(0,0,0,0.15)",
    pointerEvents: "auto", // Enable pointer events on the overlays
    width: style.width || width,
    minHeight: style.minHeight || minHeight,
    padding: isShortContent ? "12px 16px" : "16px",
    fontSize: isShortContent ? "14px" : "16px"
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
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
        const isShortContent = editedContent.length < 100;
        const contentWidth = isShortContent ? Math.max(200, editedContent.length * 4) : 300;
        const contentMinHeight = isShortContent ? 60 : 100;
        
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
          url: currentData?.layout?.url || "" // Keep the original URL
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

  // Enable dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return
    
    // Don't initiate drag if clicking on the edit button
    if ((e.target as HTMLElement).classList.contains('edit-button')) {
      return;
    }
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    // Get initial positions
    const startX = e.clientX
    const startY = e.clientY
    const startLeft = position.left
    const startTop = position.top
    
    // Handle mouse move
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Update the position state
      const newPosition = {
        left: startLeft + deltaX,
        top: startTop + deltaY
      };
      
      setPosition(newPosition);
    }
    
    // Handle mouse up
    const handleMouseUp = (mouseUpEvent: MouseEvent) => {
      setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // If dragged a significant amount, don't trigger click
      const deltaX = mouseUpEvent.clientX - startX
      const deltaY = mouseUpEvent.clientY - startY
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        // Calculate final position explicitly to avoid async state issues
        const finalPosition = {
          top: startTop + deltaY,
          left: startLeft + deltaX
        };
        
        // Save the final position directly without relying on state
        savePosition(finalPosition);
      }
    }
    
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
            url: currentData?.layout?.url || "" // Keep the original URL
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
          
          // Update local state to match what was saved
          setPosition(posToSave);
          
          console.log("Position updated successfully");
        } catch (error) {
          console.error("Error updating position:", error);
        }
      }
    }
    
    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (isEditing) {
    return (
      <div style={{
        ...overlayStyle,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <div 
          style={{ 
            padding: "8px 12px", 
            backgroundColor: "#4285F4", 
            color: "white",
            cursor: "move",
            userSelect: "none"
          }}
          onMouseDown={handleMouseDown}
        >
          Edit Note
        </div>
        <textarea
          style={{
            width: "100%",
            minHeight: "150px",
            padding: "16px",
            border: "none",
            outline: "none",
            resize: "vertical",
            fontFamily: "sans-serif",
            fontSize: "14px",
            flex: 1
          }}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          autoFocus
        />
        {url && (
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid #eee",
            fontSize: "12px",
            color: "#666"
          }}>
            <div style={{ marginBottom: "6px" }}>This note appears on:</div>
            <div style={{ 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap",
              padding: "6px 8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              border: "1px solid #eee"
            }}>
              {url}
            </div>
          </div>
        )}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px",
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #ddd"
        }}>
          <button 
            onClick={() => setIsEditing(false)}
            style={{ 
              padding: "6px 12px", 
              backgroundColor: "#f5f5f5", 
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            style={{ 
              padding: "6px 12px", 
              backgroundColor: "#4285F4", 
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      style={{
        ...overlayStyle,
        position: "relative"
      }} 
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit button - only shown when hovered */}
      {isHovered && (
        <button
          className="edit-button"
          onClick={handleEditClick}
          style={{
            position: "absolute",
            top: "3px",
            right: "3px",
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
      )}
      
      {/* Option 1: Simple text rendering */}
      {typeof content === 'string' && !content.includes('<') && content}
      
      {/* Option 2: HTML content rendering */}
      {typeof content === 'string' && content.includes('<') && (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      )}
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