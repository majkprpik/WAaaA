import React, { useState, useRef, useEffect } from "react";
import type { 
  OverlayLayout, 
  NoteLayout, 
  ButtonLayout, 
  TimerLayout, 
  SearchLayout, 
  ChatAiLayout, 
  FormLayout,
  GridLayout 
} from "../utils/createOverlay";
import DynamicOverlay from "../DynamicOverlay";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIApiKey, saveOpenAIApiKey } from "./ApiKeyConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Copy, SendHorizontal, User } from "lucide-react";

// const SUPABASE_URL = "http://127.0.0.1:54321"
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"


const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
  
  

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Temporary placeholder components - these will be implemented fully later
const BaseCustomOverlay: React.FC<any> = ({ 
  id, 
  style, 
  url, 
  zIndex, 
  onDelete, 
  onPin, 
  children,
  ...props
}) => {
  const [isPinned, setIsPinned] = useState(url === "" || !url);
  const [position, setPosition] = useState({
    top: typeof style.top === 'number' ? style.top : 0,
    left: typeof style.left === 'number' ? style.left : 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showProfileIcons, setShowProfileIcons] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Refs to store event handlers
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  
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
  
  // Save position to database
  const savePositionToDatabase = async (posToSave: { top: number, left: number }) => {
    if (!id) return;
    
    try {
      // First fetch the current data
      const { data: currentData, error: fetchError } = await supabase
        .from("overlays")
        .select("layout")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create updated layout with new position
      const updatedLayout = {
        ...(currentData?.layout || {}),
        style: {
          ...(currentData?.layout?.style || {}),
          top: posToSave.top,
          left: posToSave.left
        }
      };
      
      // Update in database
      const { error } = await supabase
        .from("overlays")
        .update({ layout: updatedLayout })
        .eq("id", id);
      
      if (error) throw error;
      
      console.log("Position saved to database successfully");
    } catch (error) {
      console.error("Error saving position to database:", error);
    }
  };
  
  // Save pin state to database
  const savePinStateToDatabase = async (pinned: boolean) => {
    if (!id) return;
    
    try {
      // First fetch the current data
      const { data: currentData, error: fetchError } = await supabase
        .from("overlays")
        .select("layout")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create updated layout with new URL (empty if pinned)
      const updatedLayout = {
        ...(currentData?.layout || {}),
        url: pinned ? "" : window.location.href
      };
      
      // Update in database
      const { error } = await supabase
        .from("overlays")
        .update({ layout: updatedLayout })
        .eq("id", id);
      
      if (error) throw error;
      
      console.log(`Overlay ${pinned ? "pinned" : "unpinned"} successfully`);
    } catch (error) {
      console.error(`Error ${isPinned ? "unpinning" : "pinning"} overlay:`, error);
    }
  };
  
  // Handle the delete action
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (!id) return;
    
    try {
      // Delete directly from the database without confirmation
      const { error } = await supabase
        .from("overlays")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      console.log("Item deleted successfully");
      
      // Notify parent component
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  
  // Handle the pin/unpin action
  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const newPinState = !isPinned;
    setIsPinned(newPinState);
    
    // Save to database
    await savePinStateToDatabase(newPinState);
    
    // Notify parent
    if (onPin) {
      onPin(newPinState);
    }
  };
  
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
  
  // Stop propagation of all events
  const stopAllPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  
  // Drag functionality
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
    
    // Clean up existing handlers just in case
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
        
        // Save to database
        savePositionToDatabase(finalPosition);
      }
    };
    
    // Save handlers to refs
    mouseMoveHandlerRef.current = handleMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;
    
    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  
  // Update the overlayStyle with current position
  const overlayStyle = {
    ...style,
    position: "fixed",
    top: position.top,
    left: position.left,
    zIndex,
    backgroundColor: style.backgroundColor || "#fff",
    border: style.border || "1px solid #ccc",
    borderRadius: style.borderRadius || "4px",
    boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.2)" : (isHovered ? "0 4px 12px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.1)"),
    padding: style.padding !== undefined ? style.padding : "16px",
    minWidth: "150px",
    minHeight: "40px",
    maxHeight: style.height ? style.height : "80vh",
    maxWidth: style.width ? style.width : "90vw",
    width: style.width ? style.width : "auto",
    height: style.height ? style.height : "auto",
    display: "flex",
    flexDirection: "column",
    cursor: isDragging ? "grabbing" : "grab",
    transition: isDragging ? "none" : "box-shadow 0.2s ease",
    overflow: "hidden"
  };
  
  return (
    <div
      ref={overlayRef}
      style={overlayStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={stopAllPropagation}
    >
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: "3px",
          right: "3px",
          display: "flex",
          gap: "4px",
          zIndex: 1
        }}
      >
        {/* Pin button */}
        <button
          onClick={handlePin}
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
        
        {/* Delete button */}
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
          title="Delete"
        >
          🗑
        </button>
      </div>
      
      {/* Right side buttons - copy and send */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "-36px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "3px",
          zIndex: 1
        }}
      >
        {/* Copy button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            // Get content to copy - could be different based on overlay type
            let contentToCopy = "";
            if ('content' in props) {
              contentToCopy = props.content;
            } else if (children) {
              // Try to extract text content from children
              const tempDiv = document.createElement('div');
              tempDiv.appendChild(React.cloneElement(children as React.ReactElement).props.children);
              contentToCopy = tempDiv.textContent || "";
            }
            
            if (contentToCopy) {
              navigator.clipboard.writeText(contentToCopy);
              console.log("Content copied to clipboard");
            }
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
          title="Send to another user"
        >
          <SendHorizontal size={16} />
        </button>
        
        {/* Add Copy Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            
            // Copy overlay to current user
            const copyToCurrentUser = async () => {
              if (!id) return;
              
              try {
                // Get current username from background script
                let currentUsername = "anonymous";
                try {
                  const response = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
                      resolve(response);
                    });
                  });
                  
                  if (response && response.username) {
                    currentUsername = response.username;
                  }
                } catch (error) {
                  console.error("Error getting username from background:", error);
                  // Fallback to localStorage only as a backup
                  currentUsername = localStorage.getItem("overlay_username") || "anonymous";
                }
                
                // Get current overlay data
                const { data: overlayData, error: fetchError } = await supabase
                  .from("overlays")
                  .select("*")
                  .eq("id", id)
                  .single();
                  
                if (fetchError) throw fetchError;
                
                // Create a new overlay with the same layout but for current user
                const newOverlay = {
                  name: overlayData.name,
                  layout: overlayData.layout,
                  users: currentUsername
                };
                
                // Insert new overlay
                const { error } = await supabase
                  .from("overlays")
                  .insert(newOverlay);
                  
                if (error) throw error;
                
                console.log("Overlay copied successfully for", currentUsername);
              } catch (error) {
                console.error("Error copying overlay:", error);
              }
            };
            
            copyToCurrentUser();
          }}
          style={{
            backgroundColor: "#00B0FF",
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
            marginLeft: "4px"
          }}
          title="Copy overlay for yourself"
        >
          <Copy size={16} />
        </button>
        
        {/* Profile icons that appear when send is clicked */}
        {showProfileIcons && (
          <div style={{
            position: "absolute",
            top: "50%",
            right: "70px",  // Adjusted position to account for the new Copy button
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 2,
            width: "96px" // Make container a bit wider to fit buttons
          }}>
            {/* Share with All Team */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // Share overlay with all team members
                const shareWithAllUsers = async () => {
                  if (!id) return;
                  
                  try {
                    // Get current overlay data
                    const { data: overlayData, error: fetchError } = await supabase
                      .from("overlays")
                      .select("users")
                      .eq("id", id)
                      .single();
                      
                    if (fetchError) throw fetchError;
                    
                    // Add all team members to users list
                    const currentUsers = overlayData?.users || "";
                    const usersList = currentUsers.split(";").filter(user => user.trim() !== "");
                    
                    // Add all users if not already in the list
                    if (!usersList.includes("vedran")) usersList.push("vedran");
                    if (!usersList.includes("bruno")) usersList.push("bruno");
                    if (!usersList.includes("marko")) usersList.push("marko");
                    
                    // Update the users field
                    const updatedUsers = usersList.join(";");
                    
                    const { error } = await supabase
                      .from("overlays")
                      .update({ users: updatedUsers })
                      .eq("id", id);
                      
                    if (error) throw error;
                    
                    console.log("Overlay shared with all team members successfully");
                  } catch (error) {
                    console.error("Error sharing overlay with team:", error);
                  }
                };
                
                shareWithAllUsers();
                setShowProfileIcons(false);
              }}
              style={{
                backgroundColor: "#8754D6", // Purple color to differentiate from individual shares
                color: "white",
                border: "none",
                borderRadius: "6px",
                width: "80px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Share with all team members"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>All Team</span>
            </button>
            
            {/* Vedran */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // Share overlay with Vedran
                const shareWithUser = async () => {
                  if (!id) return;
                  
                  try {
                    // Get current overlay data
                    const { data: overlayData, error: fetchError } = await supabase
                      .from("overlays")
                      .select("users")
                      .eq("id", id)
                      .single();
                      
                    if (fetchError) throw fetchError;
                    
                    // Add Vedran to users list with semicolon delimiter
                    const currentUsers = overlayData?.users || "";
                    const usersList = currentUsers.split(";").filter(user => user.trim() !== "");
                    
                    // Add Vedran if not already in the list
                    if (!usersList.includes("vedran")) {
                      usersList.push("vedran");
                    }
                    
                    // Update the users field
                    const updatedUsers = usersList.join(";");
                    
                    const { error } = await supabase
                      .from("overlays")
                      .update({ users: updatedUsers })
                      .eq("id", id);
                      
                    if (error) throw error;
                    
                    console.log("Overlay shared with Vedran successfully");
                  } catch (error) {
                    console.error("Error sharing overlay with Vedran:", error);
                  }
                };
                
                shareWithUser();
                setShowProfileIcons(false);
              }}
              style={{
                backgroundColor: "#FF6B6B",
                color: "white",
                border: "none",
                borderRadius: "6px",
                width: "80px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Send to Vedran"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>vedran</span>
            </button>
            
            {/* Bruno */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // Share overlay with Bruno
                const shareWithUser = async () => {
                  if (!id) return;
                  
                  try {
                    // Get current overlay data
                    const { data: overlayData, error: fetchError } = await supabase
                      .from("overlays")
                      .select("users")
                      .eq("id", id)
                      .single();
                      
                    if (fetchError) throw fetchError;
                    
                    // Add Bruno to users list with semicolon delimiter
                    const currentUsers = overlayData?.users || "";
                    const usersList = currentUsers.split(";").filter(user => user.trim() !== "");
                    
                    // Add Bruno if not already in the list
                    if (!usersList.includes("bruno")) {
                      usersList.push("bruno");
                    }
                    
                    // Update the users field
                    const updatedUsers = usersList.join(";");
                    
                    const { error } = await supabase
                      .from("overlays")
                      .update({ users: updatedUsers })
                      .eq("id", id);
                      
                    if (error) throw error;
                    
                    console.log("Overlay shared with Bruno successfully");
                  } catch (error) {
                    console.error("Error sharing overlay with Bruno:", error);
                  }
                };
                
                shareWithUser();
                setShowProfileIcons(false);
              }}
              style={{
                backgroundColor: "#4ECDC4",
                color: "white",
                border: "none",
                borderRadius: "6px",
                width: "80px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Send to Bruno"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>bruno</span>
            </button>
            
            {/* Marko */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // Share overlay with Marko
                const shareWithUser = async () => {
                  if (!id) return;
                  
                  try {
                    // Get current overlay data
                    const { data: overlayData, error: fetchError } = await supabase
                      .from("overlays")
                      .select("users")
                      .eq("id", id)
                      .single();
                      
                    if (fetchError) throw fetchError;
                    
                    // Add Marko to users list with semicolon delimiter
                    const currentUsers = overlayData?.users || "";
                    const usersList = currentUsers.split(";").filter(user => user.trim() !== "");
                    
                    // Add Marko if not already in the list
                    if (!usersList.includes("marko")) {
                      usersList.push("marko");
                    }
                    
                    // Update the users field
                    const updatedUsers = usersList.join(";");
                    
                    const { error } = await supabase
                      .from("overlays")
                      .update({ users: updatedUsers })
                      .eq("id", id);
                      
                    if (error) throw error;
                    
                    console.log("Overlay shared with Marko successfully");
                  } catch (error) {
                    console.error("Error sharing overlay with Marko:", error);
                  }
                };
                
                shareWithUser();
                setShowProfileIcons(false);
              }}
              style={{
                backgroundColor: "#FFD166",
                color: "white",
                border: "none",
                borderRadius: "6px",
                width: "80px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Send to Marko"
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>marko</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div style={{ 
        marginTop: "20px", 
        width: "100%", 
        height: "100%", 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column" 
      }}>
        {children}
      </div>
    </div>
  );
};

// Placeholder implementations for the custom overlay components
const ButtonOverlay: React.FC<any> = (props) => (
  <BaseCustomOverlay {...props}>
    <button 
      style={{ 
        backgroundColor: props.color || "#4285F4", 
        color: "white",
        border: "none",
        borderRadius: "4px",
        padding: "8px 16px",
        cursor: "pointer",
        fontSize: "14px"
      }}
      onClick={() => console.log(`Button action: ${props.action}`)}
    >
      {props.icon && <span style={{ marginRight: "8px" }}>{props.icon}</span>}
      {props.label || "Button"}
    </button>
  </BaseCustomOverlay>
);

const TimerOverlay: React.FC<any> = (props) => {
  const [timeLeft, setTimeLeft] = useState(props.duration || 300);
  const [isRunning, setIsRunning] = useState(props.autoStart || false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start the timer
  const startTimer = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer complete
          if (intervalId) clearInterval(intervalId);
          setIsRunning(false);
          
          // Call onComplete if provided
          if (props.onComplete) {
            console.log("Timer complete, executing:", props.onComplete);
          }
          
          // Save to database if ID provided
          if (props.id) {
            saveTimerStateToDatabase(0, false);
          }
          
          return 0;
        }
        
        // Save to database periodically (every 5 seconds)
        if (prev % 5 === 0 && props.id) {
          saveTimerStateToDatabase(prev - 1, true);
        }
        
        return prev - 1;
      });
    }, 1000);
    
    setIntervalId(id);
  };

  // Pause the timer
  const pauseTimer = () => {
    if (!isRunning) return;
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    
    // Save state to database if ID provided
    if (props.id) {
      saveTimerStateToDatabase(timeLeft, false);
    }
  };

  // Reset the timer
  const resetTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setTimeLeft(props.duration || 300);
    
    // Save state to database if ID provided
    if (props.id) {
      saveTimerStateToDatabase(props.duration || 300, false);
    }
  };

  // Save timer state to database
  const saveTimerStateToDatabase = async (time: number, running: boolean) => {
    if (!props.id) return;
    
    try {
      // First fetch the current data
      const { data: currentData, error: fetchError } = await supabase
        .from("overlays")
        .select("layout")
        .eq("id", props.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create updated layout with new state
      const updatedLayout = {
        ...(currentData?.layout || {}),
        duration: time,
        autoStart: running
      };
      
      // Update in database
      const { error } = await supabase
        .from("overlays")
        .update({ layout: updatedLayout })
        .eq("id", props.id);
      
      if (error) throw error;
      
      console.log("Timer state saved successfully");
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  };

  // Start timer automatically if autoStart is true
  useEffect(() => {
    if (props.autoStart) {
      startTimer();
    }
    
    // Clean up the interval when component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <BaseCustomOverlay {...props}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", fontWeight: "bold", margin: "16px 0" }}>
          {formatTime(timeLeft)}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
          {!isRunning ? (
            <button 
              onClick={startTimer}
              style={{ 
                backgroundColor: "#4285F4", 
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              {timeLeft === props.duration ? "Start" : "Resume"}
            </button>
          ) : (
            <button 
              onClick={pauseTimer}
              style={{ 
                backgroundColor: "#EA4335", 
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Pause
            </button>
          )}
          
          {timeLeft !== props.duration && (
            <button 
              onClick={resetTimer}
              style={{ 
                backgroundColor: "#FBBC05", 
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </BaseCustomOverlay>
  );
};

const SearchOverlay: React.FC<any> = (props) => (
  <BaseCustomOverlay {...props}>
    <div>
      <input
        type="text"
        placeholder={props.placeholder || "Search..."}
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px"
        }}
      />
      {props.suggestions && props.suggestions.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          {props.suggestions.map((suggestion: string, index: number) => (
            <div key={index} style={{ padding: "4px", cursor: "pointer" }}>
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  </BaseCustomOverlay>
);

// ChatAI overlay component
const ChatAiOverlay: React.FC<any> = (props) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(props.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages on update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Save messages to database
  const saveMessagesToDatabase = async (newMessages: any[]) => {
    if (!props.id) return;
    
    try {
      // First fetch the current data
      const { data: currentData, error: fetchError } = await supabase
        .from("overlays")
        .select("layout")
        .eq("id", props.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create updated layout with new messages
      const updatedLayout = {
        ...(currentData?.layout || {}),
        messages: newMessages
      };
      
      // Update in database
      const { error } = await supabase
        .from("overlays")
        .update({ layout: updatedLayout })
        .eq("id", props.id);
      
      if (error) throw error;
      
      console.log("Chat messages saved successfully");
    } catch (error) {
      console.error("Error saving chat messages:", error);
    }
  };

  // Call OpenAI API
  const callOpenAI = async (messages: any[]) => {
    try {
      const apiKey = getOpenAIApiKey();
      
      if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
        // If no valid API key is found, prompt the user for one
        const userApiKey = window.prompt("Please enter your OpenAI API key (it will be stored locally):");
        if (!userApiKey) {
          throw new Error("API key is required");
        }
        saveOpenAIApiKey(userApiKey);
      }
      
      // Format messages for OpenAI API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call the OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getOpenAIApiKey()}`
        },
        body: JSON.stringify({
          model: props.model || "gpt-3.5-turbo",
          messages: formattedMessages,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error calling OpenAI API");
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return `Error: ${error.message || "Failed to call OpenAI API"}`;
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const newMessages = [
      ...messages, 
      { 
        role: "user", 
        content: input,
        timestamp: Date.now()
      }
    ];
    
    // Update state and clear input
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    
    // Save to database
    await saveMessagesToDatabase(newMessages);
    
    try {
      // Call OpenAI
      const aiResponse = await callOpenAI(newMessages);
      
      // Add AI response to messages
      const updatedMessages = [
        ...newMessages,
        {
          role: "assistant",
          content: aiResponse,
          timestamp: Date.now()
        }
      ];
      
      setMessages(updatedMessages);
      await saveMessagesToDatabase(updatedMessages);
    } catch (error) {
      // Add error message
      const errorMessages = [
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${error.message || "Failed to get AI response"}`,
          timestamp: Date.now()
        }
      ];
      
      setMessages(errorMessages);
      await saveMessagesToDatabase(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-ai-overlay" style={{ 
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      border: "1px solid #2684FF",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "white"
    }}>
      {/* Top bar with pin and delete icons */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "10px",
        borderBottom: "1px solid #f0f0f0"
      }}>
        {/* Icons would go here */}
      </div>
      
      {/* Messages area - scrollable */}
      <div style={{ 
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        backgroundColor: "white"
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            color: "#888", 
            textAlign: "center", 
            margin: "auto 0",
            fontStyle: "italic",
            fontSize: "16px" 
          }}>
            Start a conversation with the AI
          </div>
        ) : (
          messages.map((msg: any, index: number) => (
            <div 
              key={index}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "#2684FF" : "#f1f1f1",
                color: msg.role === "user" ? "white" : "black",
                padding: "10px 14px",
                borderRadius: "18px",
                maxWidth: "80%",
                wordBreak: "break-word",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}
            >
              {msg.content}
            </div>
          ))
        )}
        {isLoading && (
          <div 
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#f1f1f1",
              color: "#888",
              padding: "8px 12px",
              borderRadius: "18px",
              maxWidth: "80%"
            }}
          >
            <i>Thinking...</i>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Bottom border line */}
      <div style={{ borderTop: "1px solid #f0f0f0" }} />
      
      {/* Input area */}
      <div style={{ 
        padding: "15px",
        display: "flex",
        gap: "10px",
        backgroundColor: "white",
        alignItems: "center"
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Build your task..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 15px",
            borderRadius: "24px",
            border: "1px solid #e0e0e0",
            outline: "none",
            fontSize: "14px",
            backgroundColor: "#f9f9f9"
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            backgroundColor: "#152238",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 25px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: isLoading || !input.trim() ? "default" : "pointer"
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

// Add FormOverlay component after other overlay components
const FormOverlay: React.FC<any> = (props) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize form data with default values
  useEffect(() => {
    const initialData: Record<string, any> = {};
    props.fields?.forEach((field: any) => {
      if (field.defaultValue !== undefined) {
        initialData[field.id] = field.defaultValue;
      }
    });
    setFormData(initialData);
  }, [props.fields]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    props.fields?.forEach((field: any) => {
      if (field.required && !formData[field.id]) {
        errors[field.id] = `${field.label} is required`;
        isValid = false;
      }

      if (field.type === "email" && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          errors[field.id] = "Please enter a valid email address";
          isValid = false;
        }
      }

      if (field.type === "number" && formData[field.id]) {
        if (isNaN(Number(formData[field.id]))) {
          errors[field.id] = "Please enter a valid number";
          isValid = false;
        }
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // If there's a submission endpoint, send data there
      if (props.submitEndpoint) {
        const response = await fetch(props.submitEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          throw new Error(`Submission failed: ${response.statusText}`);
        }
      }
      
      // Save form data to Supabase (associated with this overlay)
      if (props.id) {
        const { error } = await supabase
          .from("form_submissions")
          .insert({
            overlay_id: props.id,
            form_data: formData,
            submitted_at: new Date().toISOString()
          });
          
        if (error) {
          throw error;
        }
      }
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      // Reset form if needed
      setFormData({});
      
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("There was an error submitting the form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const fieldError = formErrors[field.id];
    
    switch (field.type) {
      case "text":
      case "email":
      case "number":
      case "password":
        return (
          <div key={field.id} className="space-y-2 mb-4">
            <label 
              htmlFor={field.id} 
              className="text-sm font-medium"
            >
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <Input
              id={field.id}
              type={field.type}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              aria-invalid={!!fieldError}
              className={fieldError ? "border-red-500" : ""}
            />
            {fieldError && (
              <div className="text-red-500 text-xs mt-1">
                {fieldError}
              </div>
            )}
          </div>
        );
        
      case "textarea":
        return (
          <div key={field.id} className="space-y-2 mb-4">
            <label 
              htmlFor={field.id} 
              className="text-sm font-medium"
            >
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={field.id}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              rows={4}
              className={`w-full min-h-[80px] rounded-md border ${fieldError ? "border-red-500" : "border-input"} bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {fieldError && (
              <div className="text-red-500 text-xs mt-1">
                {fieldError}
              </div>
            )}
          </div>
        );
        
      case "select":
        return (
          <div key={field.id} className="space-y-2 mb-4">
            <label 
              htmlFor={field.id} 
              className="text-sm font-medium"
            >
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={field.id}
              value={formData[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full h-9 rounded-md border ${fieldError ? "border-red-500" : "border-input"} bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="">Select an option</option>
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError && (
              <div className="text-red-500 text-xs mt-1">
                {fieldError}
              </div>
            )}
          </div>
        );
        
      case "checkbox":
        return (
          <div key={field.id} className="mb-4">
            <div className="flex items-center space-x-2">
              <input
                id={field.id}
                type="checkbox"
                checked={!!formData[field.id]}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label 
                htmlFor={field.id} 
                className="text-sm font-medium cursor-pointer"
              >
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            </div>
            {fieldError && (
              <div className="text-red-500 text-xs mt-1 ml-6">
                {fieldError}
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <BaseCustomOverlay {...props}>
      <div className="p-4">
        {props.title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {props.title}
          </h3>
        )}
        
        {showSuccess ? (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-md text-center mb-4">
            {props.successMessage || "Form submitted successfully!"}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            {props.fields?.map(renderField)}
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4"
            >
              {isSubmitting ? "Submitting..." : (props.submitButtonText || "Submit")}
            </Button>
          </form>
        )}
      </div>
    </BaseCustomOverlay>
  );
};

// Add GridOverlay component after the FormOverlay component
const GridOverlay: React.FC<any> = (props) => {
  console.log("GridOverlay props:", JSON.stringify(props, null, 2));
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(props.pagination?.pageSize || 10);
  const [sortColumn, setSortColumn] = useState(props.sorting?.defaultSortColumn || "");
  const [sortDirection, setSortDirection] = useState(props.sorting?.defaultSortDirection || "asc");
  const [filterValue, setFilterValue] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize data and check for issues
  useEffect(() => {
    try {
      if (!props.data || !Array.isArray(props.data)) {
        setError("Invalid or missing data array");
        setFilteredData([]);
        return;
      }
      
      if (!props.columns || !Array.isArray(props.columns)) {
        setError("Invalid or missing columns definition");
        setFilteredData([]);
        return;
      }
      
      // Validate columns have required properties
      const invalidColumns = props.columns.filter((col: any) => 
        !col.id || !col.header || !col.accessor);
      
      if (invalidColumns.length > 0) {
        setError(`Invalid column definition: ${JSON.stringify(invalidColumns)}`);
        setFilteredData([]);
        return;
      }
      
      // Reset error state if no issues
      setError(null);
      setFilteredData(props.data);
    } catch (err) {
      console.error("Error initializing grid:", err);
      setError(`Failed to initialize grid: ${err instanceof Error ? err.message : String(err)}`);
      setFilteredData([]);
    }
  }, [props.data, props.columns]);

  // Apply filtering
  useEffect(() => {
    if (!props.data || !Array.isArray(props.data) || error) return;
    
    try {
      if (filterValue && props.filtering?.enabled) {
        const lowercasedFilter = filterValue.toLowerCase();
        const filtered = props.data.filter(row => {
          return Object.entries(row).some(([key, value]) => {
            // Check if this column is filterable
            const column = props.columns.find((col: any) => col.accessor === key);
            if (!column || column.filterable === false) return false;
            
            // Convert value to string and check if it contains the filter
            const valueStr = String(value).toLowerCase();
            return valueStr.includes(lowercasedFilter);
          });
        });
        setFilteredData(filtered);
      } else {
        setFilteredData(props.data);
      }
    } catch (err) {
      console.error("Error filtering data:", err);
      setError(`Failed to filter data: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [filterValue, props.data, props.columns, props.filtering?.enabled, error]);

  // Apply sorting
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !props.sorting?.enabled || error || !Array.isArray(filteredData)) 
      return filteredData;
    
    try {
      return [...filteredData].sort((a, b) => {
        if (a[sortColumn] === b[sortColumn]) return 0;
        
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        // Handle different types of values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        return sortDirection === 'asc' 
          ? (aValue > bValue ? 1 : -1) 
          : (aValue < bValue ? 1 : -1);
      });
    } catch (err) {
      console.error("Error sorting data:", err);
      return filteredData;
    }
  }, [filteredData, sortColumn, sortDirection, props.sorting?.enabled, error]);

  // Get paginated data
  const paginatedData = React.useMemo(() => {
    if (!props.pagination?.enabled || error || !Array.isArray(sortedData)) 
      return sortedData;
    
    try {
      const start = currentPage * pageSize;
      return sortedData.slice(start, start + pageSize);
    } catch (err) {
      console.error("Error paginating data:", err);
      return sortedData;
    }
  }, [sortedData, currentPage, pageSize, props.pagination?.enabled, error]);

  // Handle changing sort
  const handleSort = (columnId: string) => {
    if (!props.sorting?.enabled) return;
    
    // Check if column is sortable
    const column = props.columns.find(col => col.id === columnId);
    if (!column || column.sortable === false) return;
    
    // If clicking the same column, toggle direction
    if (sortColumn === column.accessor) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by the new column in ascending order
      setSortColumn(column.accessor);
      setSortDirection('asc');
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 0) return;
    if (props.pagination?.enabled && newPage * pageSize >= filteredData.length) return;
    setCurrentPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page when changing page size
  };

  // Render cell based on column type
  const renderCell = (row: any, column: any) => {
    try {
      const value = row[column.accessor];
      
      switch (column.type) {
        case 'boolean':
          return value ? '✓' : '✗';
          
        case 'date':
          return value ? new Date(value).toLocaleDateString() : '';
          
        case 'image':
          return value ? (
            <img 
              src={value} 
              alt="Cell content" 
              style={{ width: '40px', height: '40px', objectFit: 'cover' }} 
            />
          ) : null;
          
        case 'actions':
          return (
            <div className="flex space-x-2">
              {props.rowActions?.map((action: any, i: number) => {
                // Use a fallback icon if the icon is missing or invalid
                let icon = action.icon;
                if (!icon || typeof icon !== 'string' || icon.length === 0 || icon.includes('')) {
                  // Use appropriate fallback icons
                  switch (action.label?.toLowerCase()) {
                    case 'edit':
                      icon = '✏️';
                      break;
                    case 'delete':
                      icon = '🗑️';
                      break;
                    case 'view':
                      icon = '👁️';
                      break;
                    default:
                      icon = '⚙️'; // Generic action icon
                  }
                }
                
                return (
                  <button 
                    key={i}
                    className="text-blue-500 hover:text-blue-700 p-1 rounded"
                    onClick={() => console.log(`Action ${action.label} on row`, row)}
                    title={action.label || `Action ${i+1}`}
                  >
                    {icon || action.label || `Action ${i+1}`}
                  </button>
                );
              })}
            </div>
          );
          
        default:
          return value !== undefined && value !== null ? String(value) : '';
      }
    } catch (err) {
      console.error(`Error rendering cell for column ${column?.id}:`, err);
      return '—'; // Em dash as fallback for error
    }
  };

  // Calculate total pages
  const totalPages = props.pagination?.enabled
    ? Math.ceil(filteredData.length / pageSize)
    : 1;

  return (
    <BaseCustomOverlay {...props}>
      <div className="flex flex-col h-full max-h-full w-full">
        {/* Display error if any */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* Header with title and filter */}
        <div className="flex justify-between items-center mb-2 p-4 flex-shrink-0">
          {props.title && (
            <h3 className="text-lg font-semibold text-gray-800">{props.title}</h3>
          )}
          
          {props.filtering?.enabled && !error && (
            <div className="w-64">
              <Input
                type="text"
                placeholder={props.filtering.placeholder || "Search..."}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>
        
        {/* Table - with both horizontal and vertical scrolling */}
        {!error && (
          <div className="overflow-auto flex-grow min-h-0 w-full relative" style={{ maxHeight: 'calc(100% - 20px)' }}>
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    {props.columns.map((column: any) => (
                      <th
                        key={column.id}
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${props.sorting?.enabled && column.sortable !== false ? 'cursor-pointer select-none' : ''} sticky top-0 bg-gray-50 z-10`}
                        style={{ 
                          width: column.width || 'auto',
                          minWidth: column.type === 'actions' ? '80px' : '100px'
                        }}
                        onClick={() => handleSort(column.id)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.header}</span>
                          {sortColumn === column.accessor && (
                            <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData && Array.isArray(paginatedData) && paginatedData.length > 0 ? (
                    paginatedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {props.columns.map((column: any) => (
                          <td key={column.id} className="px-6 py-4 overflow-hidden text-ellipsis">
                            {renderCell(row, column)}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td 
                        colSpan={props.columns.length} 
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {props.pagination?.enabled && !error && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 flex-shrink-0">
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">
                Rows per page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {(props.pagination.pageSizeOptions || [10, 25, 50, 100]).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handlePageChange(0)}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  {"<<"}
                </Button>
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  {"<"}
                </Button>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  {">"}
                </Button>
                <Button
                  onClick={() => handlePageChange(totalPages - 1)}
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  {">>"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseCustomOverlay>
  );
};

// New Approval Overlay component
const ApprovalOverlay: React.FC<any> = (props) => {
  // Safely access properties with default values if they don't exist
  const layout = props.layout || {};
  const style = layout.style || {};
  
  const [isApproved, setIsApproved] = useState(layout.approvedBy ? true : false);
  const [isRejected, setIsRejected] = useState(layout.rejected || false);
  const [currentUsername, setCurrentUsername] = useState<string>("");

  // Load username when component mounts
  useEffect(() => {
    // Get username from background script
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        setCurrentUsername(response.username);
      }
    });
  }, []);

  // Handle approval
  const handleApprove = async () => {
    if (isApproved || isRejected) return;

    // Update local state
    setIsApproved(true);

    // Update database if we have an ID
    if (props.id) {
      try {
        // Get current data first
        const { data: currentData, error: fetchError } = await supabase
          .from("overlays")
          .select("layout")
          .eq("id", props.id)
          .single();

        if (fetchError) throw fetchError;

        // Update the layout with approval info
        const updatedLayout = {
          ...(currentData?.layout || {}),
          approvedBy: currentUsername,
          approvedAt: Date.now()
        };

        // Save to database
        const { error } = await supabase
          .from("overlays")
          .update({ layout: updatedLayout })
          .eq("id", props.id);

        if (error) throw error;
      } catch (error) {
        console.error("Error updating approval status:", error);
      }
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (isApproved || isRejected) return;

    // Update local state
    setIsRejected(true);

    // Update database if we have an ID
    if (props.id) {
      try {
        // Get current data first
        const { data: currentData, error: fetchError } = await supabase
          .from("overlays")
          .select("layout")
          .eq("id", props.id)
          .single();

        if (fetchError) throw fetchError;

        // Update the layout with rejection info
        const updatedLayout = {
          ...(currentData?.layout || {}),
          rejected: true,
          rejectedBy: currentUsername,
          rejectedAt: Date.now()
        };

        // Save to database
        const { error } = await supabase
          .from("overlays")
          .update({ layout: updatedLayout })
          .eq("id", props.id);

        if (error) throw error;
      } catch (error) {
        console.error("Error updating rejection status:", error);
      }
    }
  };

  return (
    <BaseCustomOverlay {...props} style={style}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {layout.title && (
          <div style={{
            fontWeight: 600,
            fontSize: "18px",
            marginBottom: "12px",
            borderBottom: "1px solid #eee",
            paddingBottom: "8px"
          }}>
            {layout.title}
          </div>
        )}
        
        <div style={{ margin: "8px 0 16px" }}>
          {layout.content || "Please approve or reject this item"}
        </div>
        
        {isApproved ? (
          <div style={{ 
            color: "green", 
            padding: "8px", 
            borderRadius: "4px", 
            background: "#e6f7e6",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}>
            <span style={{ fontSize: "18px" }}>✓</span>
            <span>Approved by {layout.approvedBy || currentUsername}</span>
          </div>
        ) : isRejected ? (
          <div style={{ 
            color: "#d32f2f", 
            padding: "8px", 
            borderRadius: "4px", 
            background: "#fdecea",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}>
            <span style={{ fontSize: "18px" }}>✕</span>
            <span>Rejected by {layout.rejectedBy || currentUsername}</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={handleApprove}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {layout.approveButtonText || "Approve"}
            </button>
            <button
              onClick={handleReject}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {layout.rejectButtonText || "Reject"}
            </button>
          </div>
        )}
      </div>
    </BaseCustomOverlay>
  );
};

// New Poll Overlay component
const PollOverlay: React.FC<any> = (props) => {
  // Safely access properties with default values
  const layout = props.layout || {};
  const style = layout.style || {};
  
  const [pollOptions, setPollOptions] = useState(layout.options || []);
  const [voted, setVoted] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [totalVotes, setTotalVotes] = useState(layout.totalVotes || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Calculate the maximum votes for scaling
  const maxVotes = Math.max(...pollOptions.map(option => option.votes || 0), 1);
  
  // Load username and check if already voted
  useEffect(() => {
    // Get username from background script
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        const username = response.username;
        setCurrentUsername(username);
        
        // Check if this user has already voted
        if (layout.votedBy && Array.isArray(layout.votedBy) && layout.votedBy.includes(username)) {
          setVoted(true);
        }
      }
    });
  }, [layout.votedBy]);
  
  // Handle vote
  const handleVote = async (optionId: string) => {
    if (voted || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      // Get current data first to ensure we have the latest votes
      const { data: currentData, error: fetchError } = await supabase
        .from("overlays")
        .select("layout")
        .eq("id", props.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create a deep copy of the current layout
      const currentLayout = currentData?.layout || {};
      const currentOptions = [...(currentLayout.options || [])];
      const currentVotedBy = [...(currentLayout.votedBy || [])];
      const currentTotalVotes = (currentLayout.totalVotes || 0) + 1;
      
      // Find the option and increment its votes
      const updatedOptions = currentOptions.map(option => {
        if (option.id === optionId) {
          return { ...option, votes: (option.votes || 0) + 1 };
        }
        return option;
      });
      
      // Add user to votedBy array if not already there
      if (!currentVotedBy.includes(currentUsername)) {
        currentVotedBy.push(currentUsername);
      }
      
      // Create updated layout
      const updatedLayout = {
        ...currentLayout,
        options: updatedOptions,
        votedBy: currentVotedBy,
        totalVotes: currentTotalVotes
      };
      
      // Update in database
      const { error } = await supabase
        .from("overlays")
        .update({ layout: updatedLayout })
        .eq("id", props.id);
      
      if (error) throw error;
      
      // Update local state
      setPollOptions(updatedOptions);
      setVoted(true);
      setTotalVotes(currentTotalVotes);
      
      console.log("Vote recorded successfully");
    } catch (error) {
      console.error("Error recording vote:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Get percentage width for a vote bar
  const getPercentage = (votes: number) => {
    if (maxVotes === 0) return 0;
    return (votes / maxVotes) * 100;
  };
  
  return (
    <BaseCustomOverlay {...props} style={style}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {layout.title && (
          <div style={{
            fontWeight: 600,
            fontSize: "18px",
            marginBottom: "8px",
            borderBottom: "1px solid #eee",
            paddingBottom: "8px"
          }}>
            {layout.title}
          </div>
        )}
        
        {layout.question && (
          <div style={{ 
            margin: "0 0 16px", 
            fontSize: "16px",
            fontWeight: 500
          }}>
            {layout.question}
          </div>
        )}
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "8px"
        }}>
          {pollOptions.map(option => (
            <div 
              key={option.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "14px" }}>{option.text}</span>
                <span style={{ fontSize: "14px", fontWeight: 500 }}>{option.votes || 0} votes</span>
              </div>
              
              <div style={{
                width: "100%",
                height: "30px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
                cursor: voted ? "default" : "pointer",
                opacity: voted ? 0.9 : 1,
                transition: "all 0.2s ease"
              }} 
              onClick={() => !voted && handleVote(option.id)}
              >
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${getPercentage(option.votes || 0)}%`,
                  backgroundColor: voted ? 
                    (currentUsername && layout.votedBy?.includes(currentUsername) && option.id === pollOptions.find(opt => opt.votes === maxVotes)?.id ? 
                      "#4CAF50" : "#2196F3") : 
                    "#2196F3",
                  transition: "width 0.5s ease-out"
                }} />
                
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: option.votes > 2 ? "white" : "#333",
                  fontWeight: 500,
                  fontSize: "14px",
                  zIndex: 2
                }}>
                  {!voted ? "Click to vote" : `${Math.round(getPercentage(option.votes || 0))}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{
          marginTop: "16px",
          fontSize: "13px",
          color: "#666",
          textAlign: "center"
        }}>
          {voted ? 
            `You've voted. Total votes: ${totalVotes}` : 
            "Click on an option to vote"}
        </div>
      </div>
    </BaseCustomOverlay>
  );
};

// New Translation Overlay component
const TranslationOverlay: React.FC<any> = (props) => (
  <BaseCustomOverlay {...props}>
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "12px"
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => props.onToggleHistory?.()}
            style={{
              backgroundColor: props.showHistory ? "#4CAF50" : "#f0f0f0",
              color: props.showHistory ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {props.showHistory ? "Hide History" : "Show History"}
          </button>
          <button
            onClick={() => props.onClearFields?.()}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#333",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Clear
          </button>
        </div>
        {props.translationSource === "ai" && (
          <div
            style={{
              backgroundColor: "#E1F5FE",
              color: "#0277BD",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <div style={{ fontWeight: "bold" }}>AI Powered</div>
          </div>
        )}
      </div>

      {/* Source and target language selection */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "10px"
      }}>
        <select
          value={props.sourceLang}
          onChange={(e) => props.onSourceLangChange?.(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}
        >
          <option value="auto">Auto Detect</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
          <option value="hr">Croatian</option>
        </select>
        
        <button
          onClick={() => props.onSwitchLanguages?.()}
          style={{
            backgroundColor: "#f0f0f0",
            border: "none",
            borderRadius: "4px",
            width: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          ↔️
        </button>
        
        <select
          value={props.targetLang}
          onChange={(e) => props.onTargetLangChange?.(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
          <option value="hr">Croatian</option>
        </select>
      </div>
      
      {/* Source text input */}
      <textarea
        value={props.sourceText}
        onChange={(e) => props.onSourceTextChange?.(e.target.value)}
        placeholder="Enter text to translate"
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ddd",
          minHeight: "80px",
          marginBottom: "10px",
          resize: "vertical"
        }}
      />
      
      {/* Detected language information */}
      {props.sourceLang === "auto" && props.detectedLanguage && (
        <div
          style={{
            fontSize: "12px",
            color: "#666",
            marginBottom: "10px"
          }}
        >
          Detected language: <strong>{props.detectedLanguage}</strong>
        </div>
      )}
      
      {/* Translate button */}
      <button
        onClick={() => props.onTranslate?.()}
        disabled={props.isTranslating || !props.sourceText?.trim()}
        style={{
          backgroundColor: props.isTranslating || !props.sourceText?.trim() ? "#ddd" : "#4CAF50",
          color: props.isTranslating || !props.sourceText?.trim() ? "#999" : "white",
          border: "none",
          borderRadius: "4px",
          padding: "10px",
          marginBottom: "10px",
          fontSize: "14px",
          cursor: props.isTranslating || !props.sourceText?.trim() ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}
      >
        {props.isTranslating ? (
          <>
            <div className="spinner" style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              borderTopColor: "white",
              animation: "spin 1s ease-in-out infinite"
            }} />
            Translating...
          </>
        ) : (
          "Translate"
        )}
      </button>
      
      {/* Translation result */}
      {props.translatedText && (
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #eee",
            marginBottom: "10px"
          }}
        >
          {props.translatedText}
        </div>
      )}
      
      {/* Translation history */}
      {props.showHistory && props.history?.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #eee",
            marginTop: "10px",
            paddingTop: "10px"
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Translation History</h4>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto"
            }}
          >
            {props.history.map((item, index) => (
              <div
                key={index}
                style={{
                  fontSize: "13px",
                  marginBottom: "10px",
                  padding: "8px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px"
                }}
              >
                <div>
                  <strong>{item.sourceLang === "auto" && item.detectedLanguage ? `Detected (${item.detectedLanguage})` : item.sourceLang}</strong>: {item.sourceText}
                </div>
                <div style={{ marginTop: "4px", color: "#333" }}>
                  <strong>{item.targetLang}</strong>: {item.translatedText}
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </BaseCustomOverlay>
);

// New Explain Overlay component
const ExplainOverlay: React.FC<any> = (props) => (
  <BaseCustomOverlay {...props}>
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "12px"
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => props.onToggleHistory?.()}
            style={{
              backgroundColor: props.showHistory ? "#4CAF50" : "#f0f0f0",
              color: props.showHistory ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {props.showHistory ? "Hide History" : "Show History"}
          </button>
          <button
            onClick={() => props.onClearFields?.()}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#333",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Explanation level selection */}
      <div style={{
        marginBottom: "10px"
      }}>
        <select
          value={props.level}
          onChange={(e) => props.onLevelChange?.(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}
        >
          <option value="simple">Simple (ELI5)</option>
          <option value="detailed">Detailed</option>
          <option value="technical">Technical</option>
        </select>
      </div>
      
      {/* Input text area */}
      <textarea
        value={props.inputText}
        onChange={(e) => props.onInputTextChange?.(e.target.value)}
        placeholder="Enter text to explain"
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ddd",
          minHeight: "80px",
          marginBottom: "10px",
          resize: "vertical"
        }}
      />
      
      {/* Explain button */}
      <button
        onClick={() => props.onExplain?.()}
        disabled={props.isExplaining || !props.inputText?.trim()}
        style={{
          backgroundColor: props.isExplaining || !props.inputText?.trim() ? "#ddd" : "#4CAF50",
          color: props.isExplaining || !props.inputText?.trim() ? "#999" : "white",
          border: "none",
          borderRadius: "4px",
          padding: "10px",
          marginBottom: "10px",
          fontSize: "14px",
          cursor: props.isExplaining || !props.inputText?.trim() ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}
      >
        {props.isExplaining ? (
          <>
            <div className="spinner" style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              borderTopColor: "white",
              animation: "spin 1s ease-in-out infinite"
            }} />
            Explaining...
          </>
        ) : (
          "Explain This"
        )}
      </button>
      
      {/* Explanation result */}
      {props.explanation && (
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #eee",
            marginBottom: "10px"
          }}
        >
          {props.explanation}
        </div>
      )}
      
      {/* Explanation history */}
      {props.showHistory && props.history?.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #eee",
            marginTop: "10px",
            paddingTop: "10px"
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Explanation History</h4>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto"
            }}
          >
            {props.history.map((item, index) => (
              <div
                key={index}
                style={{
                  fontSize: "13px",
                  marginBottom: "10px",
                  padding: "8px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px"
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Input ({item.level}):
                </div>
                <div style={{ marginBottom: "8px" }}>
                  {item.inputText.length > 100 ? `${item.inputText.substring(0, 100)}...` : item.inputText}
                </div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Explanation:
                </div>
                <div>
                  {item.explanation.length > 150 ? `${item.explanation.substring(0, 150)}...` : item.explanation}
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </BaseCustomOverlay>
);

// Accept both the new strongly typed layout and the legacy format
interface OverlayFactoryProps {
  overlay: {
    id: number;
    name: string;
    layout?: any; // Allow any layout format for backward compatibility
  };
  onDelete?: (id: number) => void;
  onPin?: (id: number, isPinned: boolean) => void;
}

/**
 * Factory component that renders the appropriate overlay based on its type
 */
const OverlayFactory: React.FC<OverlayFactoryProps> = ({ overlay, onDelete, onPin }) => {
  const { id, layout } = overlay;
  
  if (!layout) {
    console.error("Overlay has no layout:", overlay);
    return null;
  }
  
  // Legacy format detection - convert to Note type
  if (!layout.type && 'content' in layout) {
    // Handle legacy note format
    return (
      <DynamicOverlay
        id={id}
        style={layout.style || {}}
        content={layout.content || ''}
        url={layout.url || ''}
        zIndex={9999999 + id}
        onDelete={onDelete ? () => onDelete(id) : undefined}
        onPin={onPin ? (isPinned: boolean) => onPin(id, isPinned) : undefined}
      />
    );
  }
  
  // Modern typed format
  if (layout.type) {
    switch (layout.type) {
      case "note":
        return (
          <DynamicOverlay
            id={id}
            style={layout.style}
            content={(layout as NoteLayout).content}
            url={layout.url}
            zIndex={9999999 + id}
            onDelete={onDelete ? () => onDelete(id) : undefined}
            onPin={onPin ? (isPinned: boolean) => onPin(id, isPinned) : undefined}
          />
        );
        
      case "button":
        const buttonLayout = layout as ButtonLayout;
        return (
          <ButtonOverlay
            id={id}
            style={buttonLayout.style}
            label={buttonLayout.label}
            action={buttonLayout.action}
            // color={buttonLayout.color}
            icon={buttonLayout.icon}
            url={buttonLayout.url}
            zIndex={9999999 + id}
            onDelete={() => onDelete && onDelete(id)}
            onPin={(isPinned) => onPin && onPin(id, isPinned)}
          />
        );
        
      case "timer":
        const timerLayout = layout as TimerLayout;
        return (
          <TimerOverlay
            id={id}
            style={timerLayout.style}
            duration={timerLayout.duration}
            autoStart={timerLayout.autoStart}
            format={timerLayout.format}
            onComplete={timerLayout.onComplete}
            url={timerLayout.url}
            zIndex={9999999 + id}
            onDelete={() => onDelete && onDelete(id)}
            onPin={(isPinned) => onPin && onPin(id, isPinned)}
          />
        );
        
      case "search":
        const searchLayout = layout as SearchLayout;
        return (
          <SearchOverlay
            id={id}
            style={searchLayout.style}
            placeholder={searchLayout.placeholder}
            target={searchLayout.target}
            suggestions={searchLayout.suggestions}
            url={searchLayout.url}
            zIndex={9999999 + id}
            onDelete={() => onDelete && onDelete(id)}
            onPin={(isPinned) => onPin && onPin(id, isPinned)}
          />
        );
        
      case "form":
        const formLayout = layout as FormLayout;
        return (
          <FormOverlay
            id={id}
            style={formLayout.style}
            title={formLayout.title}
            fields={formLayout.fields}
            submitButtonText={formLayout.submitButtonText}
            submitEndpoint={formLayout.submitEndpoint}
            successMessage={formLayout.successMessage}
            url={formLayout.url}
            zIndex={9999999 + id}
            onDelete={() => onDelete && onDelete(id)}
            onPin={(isPinned) => onPin && onPin(id, isPinned)}
          />
        );
        
      case "grid":
        const gridLayout = layout as GridLayout;
        // Ensure we have proper height and width
        if (gridLayout.style) {
          // Set reasonable defaults if not provided
          if (!gridLayout.style.width) gridLayout.style.width = 650;
          if (!gridLayout.style.height) gridLayout.style.height = 400;
          
          // Make sure padding is set to 0 for grids to maximize space
          gridLayout.style.padding = 0;
        }
        
        return (
          <GridOverlay
            id={id}
            style={gridLayout.style}
            title={gridLayout.title}
            columns={gridLayout.columns}
            data={gridLayout.data}
            pagination={gridLayout.pagination}
            sorting={gridLayout.sorting}
            filtering={gridLayout.filtering}
            rowActions={gridLayout.rowActions}
            url={gridLayout.url}
            zIndex={9999999 + id}
            onDelete={() => onDelete && onDelete(id)}
            onPin={(isPinned) => onPin && onPin(id, isPinned)}
          />
        );
        
      case "chatai":
        const chatAiLayout = layout as ChatAiLayout;
        return (
          <div
            style={{
              position: "fixed",
              top: chatAiLayout.style.top,
              left: chatAiLayout.style.left,
              width: chatAiLayout.style.width || "350px",
              height: chatAiLayout.style.height || "400px",
              zIndex: 9999999 + id,
              pointerEvents: "auto"
            }}
          >
            <ChatAiOverlay
              id={id}
              messages={chatAiLayout.messages}
              apiKey={chatAiLayout.apiKey}
              model={chatAiLayout.model}
              onDelete={() => onDelete && onDelete(id)}
              onPin={(isPinned) => onPin && onPin(id, isPinned)}
            />
          </div>
        );
        
      case "approval":
        return <ApprovalOverlay 
          id={id} 
          layout={layout} 
          style={layout.style || {}} 
          url={layout.url || ""} 
          zIndex={9999999 + id} 
          onDelete={() => onDelete && onDelete(id)} 
          onPin={(isPinned) => onPin && onPin(id, isPinned)} 
        />;
        
      case "poll":
        return <PollOverlay 
          id={id} 
          layout={layout} 
          style={layout.style || {}} 
          url={layout.url || ""} 
          zIndex={9999999 + id} 
          onDelete={() => onDelete && onDelete(id)} 
          onPin={(isPinned) => onPin && onPin(id, isPinned)} 
        />;
        
      case "translation":
        console.log("Rendering translation overlay with props", layout);
        const translationStyle = layout.style || {};
        const translationUrl = layout.url || "";
        const translationZIndex = 9999999 + id;
        
        // State for the translation overlay
        const [translationState, setTranslationState] = useState({
          showHistory: false,
          sourceLang: layout.sourceLang || "auto",
          targetLang: layout.targetLang || "en",
          sourceText: layout.sourceText || "",
          translatedText: layout.translatedText || "",
          isTranslating: false,
          detectedLanguage: layout.detectedLanguage || null,
          translationSource: layout.translationSource || "ai",
          history: layout.history || []
        });
        
        // Handler to save translation state to database
        const saveTranslationStateToDatabase = async (updatedState: any) => {
          try {
            // Get current data
            const { data: currentData, error: fetchError } = await supabase
              .from("overlays")
              .select("layout")
              .eq("id", id)
              .single();
            
            if (fetchError) throw fetchError;
            
            // Update layout with new state
            const updatedLayout = {
              ...currentData.layout,
              ...updatedState
            };
            
            // Save to database
            const { error } = await supabase
              .from("overlays")
              .update({ layout: updatedLayout })
              .eq("id", id);
            
            if (error) throw error;
            
            console.log("Translation state saved successfully");
          } catch (error) {
            console.error("Error saving translation state:", error);
          }
        };
        
        // Handler for translating text
        const handleTranslate = async () => {
          if (!translationState.sourceText.trim() || translationState.isTranslating) return;
          
          setTranslationState(prev => ({ ...prev, isTranslating: true }));
          
          try {
            const apiKey = getOpenAIApiKey();
            
            if (!apiKey) {
              throw new Error("OpenAI API key not found");
            }
            
            // Prepare the message for GPT
            const messages = [
              {
                role: "system",
                content: `You are a translation assistant. Please translate the following text from ${translationState.sourceLang === "auto" ? "the detected language" : translationState.sourceLang} to ${translationState.targetLang}. Provide only the translated text without any additional explanations or notes.`
              },
              {
                role: "user",
                content: translationState.sourceText
              }
            ];
            
            // Call the OpenAI API
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.3
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || "Error calling OpenAI API");
            }
            
            const data = await response.json();
            const translatedText = data.choices[0].message.content.trim();
            
            // Add to history
            const newHistoryItem = {
              sourceLang: translationState.sourceLang,
              targetLang: translationState.targetLang,
              sourceText: translationState.sourceText,
              translatedText: translatedText,
              detectedLanguage: translationState.sourceLang === "auto" ? "Auto-detected" : null,
              timestamp: Date.now()
            };
            
            const updatedHistory = [newHistoryItem, ...translationState.history].slice(0, 10); // Keep last 10 items
            
            const newState = {
              ...translationState,
              translatedText,
              isTranslating: false,
              history: updatedHistory
            };
            
            setTranslationState(newState);
            
            // Save to database
            await saveTranslationStateToDatabase(newState);
            
          } catch (error) {
            console.error("Translation error:", error);
            setTranslationState(prev => ({ 
              ...prev, 
              isTranslating: false,
              translatedText: `Error: ${error.message || "Failed to translate"}`
            }));
          }
        };
        
        return <TranslationOverlay
          id={id}
          layout={layout}
          style={translationStyle}
          url={translationUrl}
          zIndex={translationZIndex}
          onDelete={() => onDelete && onDelete(id)} 
          onPin={(isPinned) => onPin && onPin(id, isPinned)} 
          onToggleHistory={() => {
            setTranslationState(prev => ({ ...prev, showHistory: !prev.showHistory }));
          }}
          onClearFields={() => {
            const clearedState = {
              ...translationState,
              sourceText: "",
              translatedText: "",
              detectedLanguage: null
            };
            setTranslationState(clearedState);
            saveTranslationStateToDatabase(clearedState);
          }}
          onSourceLangChange={(value) => {
            const updatedState = { ...translationState, sourceLang: value };
            setTranslationState(updatedState);
            saveTranslationStateToDatabase(updatedState);
          }}
          onSwitchLanguages={() => {
            // Don't switch if auto-detect is selected
            if (translationState.sourceLang === "auto") return;
            
            const updatedState = {
              ...translationState,
              sourceLang: translationState.targetLang,
              targetLang: translationState.sourceLang,
              sourceText: translationState.translatedText,
              translatedText: translationState.sourceText
            };
            setTranslationState(updatedState);
            saveTranslationStateToDatabase(updatedState);
          }}
          onTargetLangChange={(value) => {
            const updatedState = { ...translationState, targetLang: value };
            setTranslationState(updatedState);
            saveTranslationStateToDatabase(updatedState);
          }}
          onSourceTextChange={(value) => {
            setTranslationState(prev => ({ ...prev, sourceText: value }));
          }}
          onTranslate={handleTranslate}
          showHistory={translationState.showHistory}
          history={translationState.history}
          sourceLang={translationState.sourceLang}
          targetLang={translationState.targetLang}
          sourceText={translationState.sourceText}
          translatedText={translationState.translatedText}
          isTranslating={translationState.isTranslating}
          detectedLanguage={translationState.detectedLanguage}
          translationSource={translationState.translationSource}
        />;
        
      case "explain":
        console.log("Rendering explain overlay with props", layout);
        const explainStyle = layout.style || {};
        const explainUrl = layout.url || "";
        const explainZIndex = 9999999 + id;
        
        // State for the explain overlay
        const [explainState, setExplainState] = useState({
          showHistory: false,
          level: layout.level || "simple",
          inputText: layout.inputText || "",
          explanation: layout.explanation || "",
          isExplaining: false,
          history: layout.history || []
        });
        
        // Handler to save explain state to database
        const saveExplainStateToDatabase = async (updatedState: any) => {
          try {
            // Get current data
            const { data: currentData, error: fetchError } = await supabase
              .from("overlays")
              .select("layout")
              .eq("id", id)
              .single();
            
            if (fetchError) throw fetchError;
            
            // Update layout with new state
            const updatedLayout = {
              ...currentData.layout,
              ...updatedState
            };
            
            // Save to database
            const { error } = await supabase
              .from("overlays")
              .update({ layout: updatedLayout })
              .eq("id", id);
            
            if (error) throw error;
            
            console.log("Explain state saved successfully");
          } catch (error) {
            console.error("Error saving explain state:", error);
          }
        };
        
        // Handler for explaining text
        const handleExplain = async () => {
          if (!explainState.inputText.trim() || explainState.isExplaining) return;
          
          setExplainState(prev => ({ ...prev, isExplaining: true }));
          
          try {
            const apiKey = getOpenAIApiKey();
            
            if (!apiKey) {
              throw new Error("OpenAI API key not found");
            }
            
            // Get prompt based on level
            let prompt = "Explain this in simple terms that a 5-year-old would understand:";
            if (explainState.level === "detailed") {
              prompt = "Explain this in detail with clear examples:";
            } else if (explainState.level === "technical") {
              prompt = "Provide a technical explanation with proper terminology:";
            }
            
            // Prepare the message for GPT
            const messages = [
              {
                role: "system",
                content: `You are an educational assistant that explains concepts clearly. ${prompt}`
              },
              {
                role: "user",
                content: explainState.inputText
              }
            ];
            
            // Call the OpenAI API
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.7
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || "Error calling OpenAI API");
            }
            
            const data = await response.json();
            const explanation = data.choices[0].message.content.trim();
            
            // Add to history
            const newHistoryItem = {
              level: explainState.level,
              inputText: explainState.inputText,
              explanation: explanation,
              timestamp: Date.now()
            };
            
            const updatedHistory = [newHistoryItem, ...explainState.history].slice(0, 10); // Keep last 10 items
            
            const newState = {
              ...explainState,
              explanation,
              isExplaining: false,
              history: updatedHistory
            };
            
            setExplainState(newState);
            
            // Save to database
            await saveExplainStateToDatabase(newState);
            
          } catch (error) {
            console.error("Explanation error:", error);
            setExplainState(prev => ({ 
              ...prev, 
              isExplaining: false,
              explanation: `Error: ${error.message || "Failed to explain"}`
            }));
          }
        };
        
        return <ExplainOverlay
          id={id}
          layout={layout}
          style={explainStyle}
          url={explainUrl}
          zIndex={explainZIndex}
          onDelete={() => onDelete && onDelete(id)} 
          onPin={(isPinned) => onPin && onPin(id, isPinned)} 
          onToggleHistory={() => {
            setExplainState(prev => ({ ...prev, showHistory: !prev.showHistory }));
          }}
          onClearFields={() => {
            const clearedState = {
              ...explainState,
              inputText: "",
              explanation: ""
            };
            setExplainState(clearedState);
            saveExplainStateToDatabase(clearedState);
          }}
          onLevelChange={(value) => {
            const updatedState = { ...explainState, level: value };
            setExplainState(updatedState);
            saveExplainStateToDatabase(updatedState);
          }}
          onInputTextChange={(value) => {
            setExplainState(prev => ({ ...prev, inputText: value }));
          }}
          onExplain={handleExplain}
          showHistory={explainState.showHistory}
          history={explainState.history}
          level={explainState.level}
          inputText={explainState.inputText}
          explanation={explainState.explanation}
          isExplaining={explainState.isExplaining}
        />;
        
      default:
        console.warn(`Unsupported overlay type: ${layout.type}`);
        return null;
    }
  }
  
  console.error("Unknown overlay format:", layout);
  return null;
};

export default OverlayFactory;