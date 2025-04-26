import React from "react"
import { createClient } from "@supabase/supabase-js"
import { calculateNextPosition } from "./utils/overlayPositioning"
import { fetchOverlays, createOverlay } from "./utils/createOverlay"
import type { NoteLayout, ButtonLayout, TimerLayout, SearchLayout, ChatAiLayout } from "./utils/createOverlay"
import { getOpenAIApiKey } from "./components/ApiKeyConfig"

const SUPABASE_URL = "http://127.0.0.1:54321"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const FloatingButton = () => {
  // Create a new note overlay
  const createNoteOverlay = async () => {
    try {
      // Get all existing overlays to calculate position
      const overlays = await fetchOverlays();
      
      // Calculate position for new overlay
      const position = calculateNextPosition(overlays);
      
      // Create the layout for the new note
      const noteLayout: NoteLayout = {
        type: "note",
        style: {
          top: position.top,
          left: position.left,
          width: 250,
          backgroundColor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          borderRadius: "8px",
          padding: "16px"
        },
        content: "",
        url: window.location.href // By default, only show on current page
      };
      
      // Create the overlay in the database
      await createOverlay("Note", noteLayout);
    } catch (error) {
      console.error("Error creating note overlay:", error);
    }
  };
  
  // Create a new button overlay
  const createButtonOverlay = async () => {
    try {
      // Get all existing overlays to calculate position
      const overlays = await fetchOverlays();
      
      // Calculate position for new overlay
      const position = calculateNextPosition(overlays);
      
      // Create the layout for the new button
      const buttonLayout: ButtonLayout = {
        type: "button",
        style: {
          top: position.top,
          left: position.left,
          backgroundColor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          borderRadius: "8px",
          padding: "16px",
          minWidth: "120px",
          minHeight: "60px"
        },
        label: "Click Me",
        action: "alert",
        color: "#4285F4",
        url: window.location.href // By default, only show on current page
      };
      
      // Create the overlay in the database
      await createOverlay("Button", buttonLayout);
    } catch (error) {
      console.error("Error creating button overlay:", error);
    }
  };
  
  // Create a new timer overlay
  const createTimerOverlay = async () => {
    try {
      // Get all existing overlays to calculate position
      const overlays = await fetchOverlays();
      
      // Calculate position for new overlay
      const position = calculateNextPosition(overlays);
      
      // Create the layout for the new timer
      const timerLayout: TimerLayout = {
        type: "timer",
        style: {
          top: position.top,
          left: position.left,
          backgroundColor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          borderRadius: "8px",
          padding: "16px",
          minWidth: "150px",
          minHeight: "80px"
        },
        duration: 300, // 5 minutes
        autoStart: false,
        format: "mm:ss",
        url: window.location.href // By default, only show on current page
      };
      
      // Create the overlay in the database
      await createOverlay("Timer", timerLayout);
    } catch (error) {
      console.error("Error creating timer overlay:", error);
    }
  };
  
  // Create a new search overlay
  const createSearchOverlay = async () => {
    try {
      // Get all existing overlays to calculate position
      const overlays = await fetchOverlays();
      
      // Calculate position for new overlay
      const position = calculateNextPosition(overlays);
      
      // Create the layout for the new search box
      const searchLayout: SearchLayout = {
        type: "search",
        style: {
          top: position.top,
          left: position.left,
          backgroundColor: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          borderRadius: "8px",
          padding: "16px",
          minWidth: "200px",
          minHeight: "50px"
        },
        placeholder: "Search...",
        url: window.location.href // By default, only show on current page
      };
      
      // Create the overlay in the database
      await createOverlay("Search", searchLayout);
    } catch (error) {
      console.error("Error creating search overlay:", error);
    }
  };
  
  // Create a new Chat AI overlay
  const createChatAiOverlay = async () => {
    try {
      // Get all existing overlays to calculate position
      const overlays = await fetchOverlays();
      
      // Calculate position for new overlay
      const position = calculateNextPosition(overlays);
      
      // Get API key from configuration
      const apiKey = getOpenAIApiKey();
      
      // Create the layout for the new chat AI widget
      const chatAiLayout: ChatAiLayout = {
        type: "chatai",
        style: {
          top: position.top,
          left: position.left,
          width: "400px",
          height: "500px"
        },
        messages: [],
        url: window.location.href, // By default, only show on current page
        apiKey: apiKey,
        model: "gpt-3.5-turbo"
      };
      
      // Create the overlay in the database
      await createOverlay("ChatAI", chatAiLayout);
    } catch (error) {
      console.error("Error creating Chat AI overlay:", error);
    }
  };

  // Menu container style
  const menuContainerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "20px",
    padding: "12px 20px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
    zIndex: 10000000,
    border: "1px solid #eaeaea"
  };

  // Menu item style
  const menuItemStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "white",
    color: "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    cursor: "pointer",
    border: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "none"
  };

  // Hover effect handled via JavaScript events
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "scale(1.1)";
    e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "none";
  };
  
  return (
    <div className="floating-button-container">
      {/* Always visible action buttons */}
      <div style={menuContainerStyle}>
        {/* Note option */}
        <div 
          style={{
            ...menuItemStyle,
            color: "#34A853" // Green
          }} 
          onClick={createNoteOverlay}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Add Note"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2V5" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 2V5" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 8H21" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 14H8" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 10V18" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 5H5C3.895 5 3 5.895 3 7V19C3 20.105 3.895 21 5 21H19C20.105 21 21 20.105 21 19V7C21 5.895 20.105 5 19 5Z" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Button option */}
        <div 
          style={{ 
            ...menuItemStyle,
            color: "#FBBC05" // Yellow
          }} 
          onClick={createButtonOverlay}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Add Button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="4" stroke="#FBBC05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12H16" stroke="#FBBC05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Timer option */}
        <div 
          style={{ 
            ...menuItemStyle,
            color: "#EA4335" // Red
          }} 
          onClick={createTimerOverlay}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Add Timer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 7V12L15 15" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Search option */}
        <div 
          style={{ 
            ...menuItemStyle,
            color: "#9C27B0" // Purple
          }} 
          onClick={createSearchOverlay}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Add Search"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" stroke="#9C27B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 16L20 20" stroke="#9C27B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FloatingButton; 
