import React, { useState, useRef, useEffect, useCallback } from "react";
import { Copy, SendHorizontal, Pin, Trash2, X, Check, User, Edit } from "lucide-react";

// Global z-index management to prevent overlays from interfering with each other
let globalOverlayCounter = 10000000;
const getNewTopZIndex = (): number => {
  return ++globalOverlayCounter;
};

interface EnhancedOverlayProps {
  children: React.ReactNode;
  id?: number;
  style: React.CSSProperties;
  content?: string; // Optional content for copying
  url?: string;
  zIndex?: number;
  onDelete?: () => void;
  onPin?: (isPinned: boolean) => void;
}

/**
 * CustomOverlayEnhancer - Adds hover controls and specialized button positioning to any custom overlay
 * Wrap your custom overlay component with this to give it the same functionality as DynamicOverlay
 */
const CustomOverlayEnhancer: React.FC<EnhancedOverlayProps> = ({
  children,
  id,
  style,
  content,
  url,
  zIndex = 9999999,
  onDelete,
  onPin
}) => {
  // State management
  const [isPinned, setIsPinned] = useState(!url || url.trim() === "");
  const [position, setPosition] = useState({
    top: typeof style.top === 'number' ? style.top : 0,
    left: typeof style.left === 'number' ? style.left : 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showProfileIcons, setShowProfileIcons] = useState(false);
  const [localZIndex, setLocalZIndex] = useState(zIndex);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  
  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  
  // Calculate appropriate dimensions based on content length
  const isShortContent = !content || content.length < 100;
  const width = isShortContent ? Math.max(200, content ? content.length * 4 : 200) : 300;
  const minHeight = isShortContent ? 60 : 100;
  
  // Load username from background script when component mounts
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        setCurrentUsername(response.username);
      }
    });
  }, []);
  
  // Helper function to ensure we have a username
  const ensureUsername = (callback: () => void) => {
    if (currentUsername) {
      callback();
    } else {
      // Try to get username from background
      chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
        if (response && response.username) {
          setCurrentUsername(response.username);
          callback();
        } else {
          // If still no username, prompt for it
          const username = prompt("Please enter your username to continue");
          if (username && username.trim()) {
            const trimmedUsername = username.trim();
            chrome.runtime.sendMessage(
              { action: "set_username", username: trimmedUsername },
              (response) => {
                if (response && response.success) {
                  setCurrentUsername(trimmedUsername);
                  callback();
                }
              }
            );
          }
        }
      });
    }
  };
  
  // Clean up event listeners when component unmounts
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
  
  // Bring this overlay to front when interacted with
  const bringToFront = useCallback(() => {
    const newTopZIndex = getNewTopZIndex(); // Get the next highest z-index
    setLocalZIndex(newTopZIndex);
    
    // Immediately update the style of the DOM element to prevent flickering
    if (overlayRef.current) {
      overlayRef.current.style.zIndex = newTopZIndex.toString();
    }
  }, []);
  
  // Handle pin toggle
  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    
    if (onPin) {
      onPin(newPinned);
    }
  };
  
  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const confirmed = window.confirm("Are you sure you want to delete this overlay?");
    if (confirmed && onDelete) {
      onDelete();
    }
  };
  
  // Update username
  const updateUsername = () => {
    const newUsername = prompt("Enter your new username", currentUsername);
    if (newUsername && newUsername.trim()) {
      const trimmedUsername = newUsername.trim();
      chrome.runtime.sendMessage(
        { action: "set_username", username: trimmedUsername },
        (response) => {
          if (response && response.success) {
            setCurrentUsername(trimmedUsername);
          }
        }
      );
    }
  };
  
  // Stop propagation of all events
  const stopAllPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  
  // Cleanup handlers
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
  
  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if clicking on a button or interactive element
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' || 
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'SELECT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    ) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    bringToFront();
    cleanupHandlers();
    
    setIsDragging(true);
    
    // Get initial positions
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = position.left;
    const startTop = position.top;
    
    // Handle mouse move
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
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
      cleanupHandlers();
      
      // Calculate final position
      const deltaX = mouseUpEvent.clientX - startX;
      const deltaY = mouseUpEvent.clientY - startY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        const finalPosition = {
          top: startTop + deltaY,
          left: startLeft + deltaX
        };
        
        // Update local state
        setPosition(finalPosition);
        
        // Update style parameter
        if (style) {
          style.top = finalPosition.top;
          style.left = finalPosition.left;
        }
      }
    };
    
    // Save handlers to refs
    mouseMoveHandlerRef.current = handleMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;
    
    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  
  // Share with user
  const shareWithUser = async (username: string) => {
    try {
      // Placeholder for share functionality
      alert(`Shared with ${username}!`);
      setShowProfileIcons(false);
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Failed to share with user");
    }
  };
  
  // Ensure position is fixed for overlays
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    ...style,
    top: position.top,
    left: position.left,
    zIndex: localZIndex,
    cursor: isDragging ? "move" : "grab",
    transition: isDragging ? "none" : "box-shadow 0.2s ease",
    boxShadow: isHovered ? "0 6px 12px rgba(0,0,0,0.2)" : style.boxShadow || "0 4px 8px rgba(0,0,0,0.15)",
    pointerEvents: "auto", // Enable pointer events on the overlays
    width: style.width || width,
    minHeight: style.minHeight || minHeight,
    padding: isShortContent ? "12px 16px" : "16px",
    fontSize: isShortContent ? "14px" : "16px",
    backgroundColor: style.backgroundColor || "#ffffff", // Ensure background to prevent click-through
    border: style.border || "1px solid #e0e0e0"
  };
  
  // Close profile icons when clicking outside
  useEffect(() => {
    if (showProfileIcons) {
      const handleClickOutside = (e: MouseEvent) => {
        if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
          setShowProfileIcons(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfileIcons]);
  
  return (
    <div 
      ref={overlayRef}
      style={overlayStyle} 
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
      title="Drag to move"
    >
      {/* Control buttons - only shown when hovered */}
      {isHovered && (
        <div style={{
          position: "absolute", 
          top: "-30px", 
          right: "0",
          display: "flex",
          gap: "8px",
          padding: "3px",
          zIndex: localZIndex + 1
        }}>
          {/* Username display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "#f0f0f0",
              color: "#555",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px"
            }}
          >
            <User size={12} />
            <span>{currentUsername || "anonymous"}</span>
            <button
              onClick={updateUsername}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Change username"
            >
              <Edit size={10} />
            </button>
          </div>
          
          {/* Pin button */}
          <button
            onClick={handlePinToggle}
            style={{
              backgroundColor: isPinned ? "#4285F4" : "transparent",
              color: isPinned ? "white" : "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
            title={isPinned ? "Unpin (show only on this page)" : "Pin (show on all pages)"}
          >
            <Pin size={16} />
          </button>
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: "transparent",
              color: "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      {/* Right side buttons - copy and send */}
      {isHovered && (
        <div style={{
          position: "absolute", 
          top: "50%",
          right: "-36px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "3px",
          zIndex: localZIndex + 1
        }}>
          {/* Copy button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              
              // Try to extract content - different methods depending on what's available
              let contentToCopy = "";
              if (content) {
                contentToCopy = content;
              } else if (overlayRef.current) {
                contentToCopy = overlayRef.current.textContent || "";
              }
              
              if (contentToCopy) {
                navigator.clipboard.writeText(contentToCopy);
                console.log("Content copied to clipboard");
              }
            }}
            style={{
              backgroundColor: "transparent",
              color: "#666",
              border: "none",
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
            title="Copy content"
          >
            <Copy size={16} />
          </button>
          
          {/* Send button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              setShowProfileIcons(!showProfileIcons);
            }}
            style={{
              backgroundColor: "transparent",
              color: "#666",
              border: "none", 
              borderRadius: "3px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
            title="Send note to another user"
          >
            <SendHorizontal size={16} />
          </button>
          
          {/* Profile icons that appear when send is clicked */}
          {showProfileIcons && (
            <div style={{
              position: "absolute",
              top: "50%",
              right: "36px",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "8px",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 2,
              width: "96px"
            }}>
              {/* User profile buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ensureUsername(() => shareWithUser("bruno"));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "#333"
                }}
              >
                <User size={14} />
                <span>Bruno</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ensureUsername(() => shareWithUser("vedran"));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "#333"
                }}
              >
                <User size={14} />
                <span>Vedran</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ensureUsername(() => shareWithUser("marko"));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "#333"
                }}
              >
                <User size={14} />
                <span>Marko</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Actual content of the custom overlay */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default CustomOverlayEnhancer; 