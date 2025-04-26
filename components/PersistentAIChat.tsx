import React, { useState, useRef, useEffect, useCallback } from "react";
import { getOpenAIApiKey } from "./ApiKeyConfig";
import { createOverlayWithCurrentUsername } from "../utils/createOverlay";
import { calculateNextPosition } from "../utils/overlayPositioning";
import { createClient } from "@supabase/supabase-js";
import { SendHorizontal, Minus, X, Plus, Maximize2, Minimize2 } from "lucide-react";

// const SUPABASE_URL = "http://127.0.0.1:54321"
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"


const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
  
  
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define the overlay format prompt
const OVERLAY_FORMAT_PROMPT = `
I need responses in a specific JSON format that can be used as overlays in my application.
Each response should follow one of these formats:

1. For a simple note:
{
  "type": "note",
  "style": {
    "width": 250,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "content": "Your text goes here"
}

2. For a button:
{
  "type": "button",
  "style": {
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "label": "Button Text",
  "action": "alert",
  "color": "#4285F4"
}

3. For a timer:
{
  "type": "timer",
  "style": {
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "duration": 300,
  "autoStart": false,
  "format": "mm:ss"
}

4. For a search element:
{
  "type": "search",
  "style": {
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "placeholder": "Search...",
  "target": "example.com"
}

5. For a form element (with multiple fields):
{
  "type": "form",
  "style": {
    "width": 400,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "0"
  },
  "title": "Contact Form",
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "Name",
      "placeholder": "Enter your name",
      "required": true
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email",
      "placeholder": "Enter your email",
      "required": true
    },
    {
      "id": "password",
      "type": "password",
      "label": "Password",
      "placeholder": "Enter your password",
      "required": true
    },
    {
      "id": "phone",
      "type": "text",
      "label": "Phone Number",
      "placeholder": "Enter your phone number"
    },
    {
      "id": "age",
      "type": "number",
      "label": "Age",
      "placeholder": "Enter your age"
    },
    {
      "id": "subject",
      "type": "select",
      "label": "Subject",
      "required": true,
      "options": [
        {"value": "general", "label": "General Inquiry"},
        {"value": "support", "label": "Technical Support"},
        {"value": "feedback", "label": "Feedback"},
        {"value": "other", "label": "Other"}
      ]
    },
    {
      "id": "priority",
      "type": "select",
      "label": "Priority",
      "options": [
        {"value": "low", "label": "Low"},
        {"value": "medium", "label": "Medium"},
        {"value": "high", "label": "High"}
      ]
    },
    {
      "id": "message",
      "type": "textarea",
      "label": "Message",
      "placeholder": "Type your message here",
      "required": true
    },
    {
      "id": "newsletter",
      "type": "checkbox",
      "label": "Subscribe to newsletter",
      "defaultValue": true
    },
    {
      "id": "consent",
      "type": "checkbox",
      "label": "I agree to the terms and conditions",
      "required": true
    }
  ],
  "submitButtonText": "Send Message",
  "successMessage": "Thank you for your message! We'll get back to you soon."
}

6. For a data grid with sorting, pagination and filtering:
{
  "type": "grid",
  "style": {
    "width": 650,
    "height": 400,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "0"
  },
  "title": "Users Data Grid",
  "columns": [
    {
      "id": "id",
      "header": "ID",
      "accessor": "id",
      "type": "number",
      "width": "60px",
      "sortable": true
    },
    {
      "id": "name",
      "header": "Name",
      "accessor": "name",
      "type": "text",
      "sortable": true,
      "filterable": true
    },
    {
      "id": "email",
      "header": "Email",
      "accessor": "email",
      "type": "text",
      "sortable": true,
      "filterable": true
    },
    {
      "id": "role",
      "header": "Role",
      "accessor": "role",
      "type": "text",
      "sortable": true,
      "filterable": true
    },
    {
      "id": "active",
      "header": "Active",
      "accessor": "active",
      "type": "boolean",
      "sortable": true
    },
    {
      "id": "actions",
      "header": "Actions",
      "accessor": "id",
      "type": "actions",
      "width": "100px"
    }
  ],
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "Admin", "active": true },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com", "role": "User", "active": true },
    { "id": 3, "name": "Robert Johnson", "email": "robert@example.com", "role": "Editor", "active": false },
    { "id": 4, "name": "Emily Davis", "email": "emily@example.com", "role": "User", "active": true },
    { "id": 5, "name": "Michael Brown", "email": "michael@example.com", "role": "User", "active": true },
    { "id": 6, "name": "Sarah Wilson", "email": "sarah@example.com", "role": "Admin", "active": false },
    { "id": 7, "name": "David Taylor", "email": "david@example.com", "role": "Editor", "active": true },
    { "id": 8, "name": "Lisa Anderson", "email": "lisa@example.com", "role": "User", "active": true },
    { "id": 9, "name": "James Thomas", "email": "james@example.com", "role": "User", "active": false },
    { "id": 10, "name": "Jennifer White", "email": "jennifer@example.com", "role": "Editor", "active": true },
    { "id": 11, "name": "Daniel Martin", "email": "daniel@example.com", "role": "User", "active": true },
    { "id": 12, "name": "Jessica Clark", "email": "jessica@example.com", "role": "Admin", "active": true }
  ],
  "pagination": {
    "enabled": true,
    "pageSize": 5,
    "pageSizeOptions": [5, 10, 20, 50]
  },
  "sorting": {
    "enabled": true,
    "defaultSortColumn": "id",
    "defaultSortDirection": "asc"
  },
  "filtering": {
    "enabled": true,
    "placeholder": "Search users..."
  },
  "rowActions": [
    {
      "label": "Edit",
      "icon": "✏️",
      "action": "edit"
    },
    {
      "label": "Delete",
      "icon": "🗑️",
      "action": "delete"
    }
  ]
}

Note that forms can have any number of fields of different types.

Please respond with valid JSON in one of these formats when I need a specific overlay type.
`;

/**
 * PersistentAIChat component
 * Displays a fixed AI chat interface in the top-right corner of the screen
 */
const PersistentAIChat: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{role: string, content: string, timestamp: number}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [overlayInstructions, setOverlayInstructions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [floatOffset, setFloatOffset] = useState(0);
  const [gradientRotation, setGradientRotation] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Context panel states
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [contextPanelVisible, setContextPanelVisible] = useState(false);
  const [contextInput, setContextInput] = useState("");
  const [contextItems, setContextItems] = useState<Array<{id: string, text: string, url: string, title: string, timestamp: number, expanded?: boolean, active?: boolean}>>([]);
  const contextInputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages on update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I can help with tasks and create interactive overlays for your screen. You can ask me to create notes, buttons, timers, or search overlays. What would you like to do?",
          timestamp: Date.now()
        }
      ]);
    }
  }, []);

  // Animation for the floating button
  useEffect(() => {
    if (!isMinimized) return;
    
    let animationFrame: number;
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds per cycle
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      
      // Calculate a sine wave for smooth floating effect
      // This will oscillate between -6 and 6
      const newOffset = -6 * Math.sin(progress * 2 * Math.PI);
      setFloatOffset(newOffset);
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isMinimized]);

  // Animation for the gradient rotation
  useEffect(() => {
    if (!isMinimized) return;
    
    let animationFrame: number;
    let startTime: number | null = null;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Rotate 360 degrees every 6 seconds (60 degrees per second)
      const newRotation = (elapsed / 6000) * 360 % 360;
      setGradientRotation(newRotation);
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isMinimized]);

  // Focus input field when chat is opened
  useEffect(() => {
    // Wait a short moment for the transition to complete
    if (!isMinimized && isVisible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isMinimized, isVisible]);

  // Call OpenAI API
  const callOpenAI = async (messages: any[]) => {
    try {
      const apiKey = getOpenAIApiKey();
      
      if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error("API key is required");
      }
      
      // Format messages for OpenAI API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Get active context items
      const activeContextItems = contextItems.filter(item => item.active);
      
      // System messages to add
      const systemMessages = [];
      
      // If overlay instructions mode is active, add the format instructions
      if (overlayInstructions) {
        systemMessages.push({
          role: "system",
          content: OVERLAY_FORMAT_PROMPT
        });
      }
      
      // If there are active context items, add them as a system message
      if (activeContextItems.length > 0) {
        systemMessages.push({
          role: "system",
          content: `Consider the following context items in your response:\n${activeContextItems.map(item => `- ${item.text}`).join('\n')}`
        });
      }
      
      // Add system messages at the beginning
      formattedMessages.unshift(...systemMessages);
      
      // Call the OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
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

  // Try to parse response as JSON overlay
  const tryParseOverlay = async (content: string) => {
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
      }
      
      // Parse JSON
      const parsedContent = JSON.parse(jsonContent);
      
      // Check if it has the expected format
      if (parsedContent && parsedContent.type && ['note', 'button', 'timer', 'search', 'form', 'grid'].includes(parsedContent.type)) {
        console.log("Creating overlay of type:", parsedContent.type);
        
        // Additional validation for grid type
        if (parsedContent.type === 'grid') {
          // Make sure columns and data are arrays
          if (!Array.isArray(parsedContent.columns)) {
            console.error("Grid columns must be an array");
            return false;
          }
          
          if (!Array.isArray(parsedContent.data)) {
            console.error("Grid data must be an array");
            return false;
          }
          
          // Fix any issues with row actions
          if (parsedContent.rowActions && Array.isArray(parsedContent.rowActions)) {
            parsedContent.rowActions = parsedContent.rowActions.map((action: any) => {
              // Replace invalid icons
              if (action.icon && action.icon.includes('')) {
                if (action.label?.toLowerCase() === 'edit') {
                  action.icon = '✏️';
                } else if (action.label?.toLowerCase() === 'delete') {
                  action.icon = '🗑️';
                } else if (action.label?.toLowerCase() === 'view') {
                  action.icon = '👁️';
                } else {
                  action.icon = '⚙️';
                }
              }
              return action;
            });
          }
        }
        
        // Get position for the new overlay
        const { data } = await supabase.from("overlays").select();
        const position = calculateNextPosition(data || []);
        
        // Add position to style
        parsedContent.style = {
          ...parsedContent.style,
          top: position.top,
          left: position.left
        };
        
        // Add URL to make it visible on current page
        parsedContent.url = window.location.href;
        
        // Create the overlay with current username
        const overlayName = parsedContent.type.charAt(0).toUpperCase() + parsedContent.type.slice(1);
        const result = await createOverlayWithCurrentUsername(overlayName, parsedContent);
        
        return result !== null;
      }
    } catch (error) {
      console.error("Error parsing overlay JSON:", error);
    }
    
    return false;
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
      
      // Check if we're in overlay mode and try to parse the response
      if (overlayInstructions) {
        const isOverlay = await tryParseOverlay(aiResponse);
        
        // If successfully created an overlay, add confirmation message
        if (isOverlay) {
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",
              content: "✅ Overlay created successfully!",
              timestamp: Date.now() + 1
            }
          ]);
        }
      }
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
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle minimized state
  const toggleMinimize = () => {
    if (isMinimized) {
      setIsMinimized(false);
      // Small delay to ensure we can see the transition
      setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
      // Wait for the fade-out transition to complete before hiding
      setTimeout(() => {
        setIsMinimized(true);
      }, 300); // Match the transition duration
    }
  };
 
  // Toggle expanded state for a context item
  const toggleExpandContextItem = (id: string) => {
    setContextItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, expanded: !item.expanded } 
          : item
      )
    );
  };
  
  // Toggle active state for a context item
  const toggleActiveContextItem = (id: string) => {
    setContextItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, active: item.active === undefined ? true : !item.active } 
          : item
      )
    );
    
    // Save to local storage
    const updatedItems = contextItems.map(item => 
      item.id === id 
        ? { ...item, active: item.active === undefined ? true : !item.active } 
        : item
    );
    localStorage.setItem('contextItems', JSON.stringify(updatedItems));
  };

  // Add a new context item
  const addContextItem = () => {
    if (!contextInput.trim()) return;
    
    const currentUrl = window.location.href;
    const words = contextInput.trim().split(/\s+/);
    const title = words[0] || "Context";
    
    const newItem = {
      id: Date.now().toString(),
      text: contextInput.trim(),
      url: currentUrl,
      title: title,
      timestamp: Date.now(),
      active: true // New items are active by default
    };
    
    setContextItems([newItem, ...contextItems]);
    setContextInput("");
    
    // Save to local storage
    const updatedItems = [newItem, ...contextItems];
    localStorage.setItem('contextItems', JSON.stringify(updatedItems));
  };
  
  // Remove a context item
  const removeContextItem = (id: string) => {
    const updatedItems = contextItems.filter(item => item.id !== id);
    setContextItems(updatedItems);
    
    // Update local storage
    localStorage.setItem('contextItems', JSON.stringify(updatedItems));
  };
  
  // Load saved context items from local storage
  useEffect(() => {
    const savedItems = localStorage.getItem('contextItems');
    if (savedItems) {
      try {
        setContextItems(JSON.parse(savedItems));
      } catch (e) {
        console.error('Error loading saved context items:', e);
      }
    }
  }, []);

  // Toggle context panel
  const openContextPanel = () => {
    if (!isContextPanelOpen) {
      setIsContextPanelOpen(true);
      // Don't close chat UI, just keep both buttons visible
      
      // Add small delay to allow animation
      setTimeout(() => {
        setContextPanelVisible(true);
        
        // Focus the input when opened
        setTimeout(() => {
          contextInputRef.current?.focus();
        }, 100);
      }, 10);
    }
  };
  
  // Close context panel with animation
  const closeContextPanel = () => {
    setContextPanelVisible(false);
    
    // Wait for the animation to finish before actually closing
    setTimeout(() => {
      setIsContextPanelOpen(false);
    }, 300);
  };

  // Toggle chat panel
  const openChatPanel = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setContextPanelVisible(false);
      setIsContextPanelOpen(false); // Close context panel if open
      
      // Small delay to ensure we can see the transition
      setTimeout(() => {
        setIsVisible(true);
        inputRef.current?.focus();
      }, 10);
    }
  };

  // Always show both buttons and render appropriate panels
  return (
    <>
      {/* Context Panel Button - always visible */}
      <div 
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: `linear-gradient(45deg, #FF5733, #FFC300, #FF9800)`,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2), 0 0 15px rgba(255, 87, 51, 0.5)",
          zIndex: 10000000,
          transform: `translateY(${floatOffset}px)`,
          transition: "transform 0.05s linear"
        }}
        title="Open Context Panel"
        onClick={openContextPanel}
      >
        {/* Intentionally empty button */}
      </div>
      
      {/* Context Panel */}
      {isContextPanelOpen && (
        <div
          style={{
            position: "fixed",
            top: "75px",
            right: "20px",
            width: "400px",
            maxWidth: "90vw",
            height: "350px", 
            maxHeight: "80vh",
            backgroundColor: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: "12px",
            zIndex: 9999999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s ease-in-out, transform 0.2s ease-out",
            opacity: contextPanelVisible ? 1 : 0,
            transform: contextPanelVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(-10px)",
            transformOrigin: "top right",
            pointerEvents: contextPanelVisible ? "auto" : "none",
          }}
        >
          <div style={{
            padding: "8px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            borderBottom: "1px solid #eee"
          }}>
            <button
              onClick={closeContextPanel}
              style={{
                background: "rgba(0,0,0,0.1)",
                border: "none",
                color: "#333",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                borderRadius: "50%",
                width: "28px",
                height: "28px"
              }}
            >
              <Minus size={16} />
            </button>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            scrollbarWidth: "thin",
            scrollbarColor: "#ddd #f5f5f5"
          }}>
            {contextItems.length === 0 ? (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: "#888",
                fontSize: "14px"
              }}>
                No context items yet. Add some text below!
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                {contextItems.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: item.active ? "#4CAF50" : "#e0e0e0",
                        borderRadius: item.expanded ? "12px 12px 0 0" : "16px",
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        width: "100%",
                        cursor: "pointer",
                        opacity: item.active ? 1 : 0.7,
                        transition: "all 0.2s ease"
                      }}
                      title={!item.expanded ? item.text : ""}
                      onClick={(e) => {
                        // Only toggle active state when clicking the main area
                        if (e.target === e.currentTarget || 
                            (e.target as HTMLElement).tagName.toLowerCase() === 'span') {
                          toggleActiveContextItem(item.id);
                        }
                      }}
                    >
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: item.active ? "white" : "#333",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        maxWidth: "calc(100% - 50px)"
                      }}>
                        {item.title}
                      </span>
                      <div style={{
                        display: "flex",
                        marginLeft: "auto",
                        gap: "4px"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandContextItem(item.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: item.active ? "white" : "#888",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title={item.expanded ? "Collapse" : "Expand"}
                        >
                          {item.expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeContextItem(item.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: item.active ? "white" : "#888",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    
                    {item.expanded && (
                      <div
                        style={{
                          padding: "10px 12px",
                          backgroundColor: "#f9f9f9",
                          borderRadius: "0 0 12px 12px",
                          fontSize: "13px",
                          lineHeight: "1.4",
                          borderLeft: "1px solid #eee",
                          borderRight: "1px solid #eee",
                          borderBottom: "1px solid #eee"
                        }}
                      >
                        <a 
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2684FF",
                            fontSize: "12px",
                            display: "block",
                            marginBottom: "6px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {item.url}
                        </a>
                        <p style={{
                          margin: 0,
                          color: "#333",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        }}>
                          {item.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{
            padding: "10px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: "8px",
            backgroundColor: "white",
            alignItems: "center"
          }}>
            <input
              ref={contextInputRef as any}
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addContextItem()}
              placeholder="Add text to your context library..."
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                outline: "none",
                fontSize: "14px",
                backgroundColor: "#f9f9f9"
              }}
            />
            <button
              onClick={addContextItem}
              disabled={!contextInput.trim()}
              style={{
                backgroundColor: contextInput.trim() ? "#FF9800" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: contextInput.trim() ? "pointer" : "default",
                opacity: contextInput.trim() ? 1 : 0.6,
                padding: 0
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Chat Button - always visible */}
      <div 
        onClick={openChatPanel}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: `linear-gradient(${gradientRotation}deg, #00C9FF, #2AC84B, #EDF259)`,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 201, 255, 0.5)",
          zIndex: 10000000,
          fontSize: "24px",
          transform: `translateY(${floatOffset}px)`,
          transition: "transform 0.05s linear"
        }}
        title="Open chat"
      >
        {/* Intentionally empty button */}
      </div>

      {/* Chat Panel */}
      {!isMinimized && (
        <div 
          style={{
            position: "fixed",
            display: "flex",
            flexDirection: "column",
            bottom: "20px",
            right: "20px",
            width: "400px",
            maxWidth: "90vw",
            height: "400px",
            maxHeight: "80vh",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            transition: "all 0.3s ease-in-out, transform 0.2s ease-out",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "scale(1)" : "scale(0.95)",
            pointerEvents: isVisible ? "auto" : "none",
            overflow: "hidden",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
        >
          {/* Minimize button - only visible on hover */}
          <button
            onClick={() => {
              setIsVisible(false);
              // Wait for the fade-out transition to complete before hiding
              setTimeout(() => {
                setIsMinimized(true);
              }, 300); // Match the transition duration
            }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              backgroundColor: "rgba(0,0,0,0.1)",
              color: "#333",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 1,
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.2s ease-in-out"
            }}
            title="Minimize chat"
          >
            <Minus size={16} />
          </button>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              paddingTop: "40px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: "white"
            }}
            ref={messagesEndRef}
          >
            {messages.map((msg, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "#2684FF" : "#f1f1f1",
                  color: msg.role === "user" ? "white" : "#333",
                  padding: "12px 16px",
                  borderRadius: "18px",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  fontSize: "14px"
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div 
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#f1f1f1",
                  color: "#888",
                  padding: "10px 14px",
                  borderRadius: "18px",
                  maxWidth: "80%",
                  fontSize: "14px"
                }}
              >
                <i>Thinking...</i>
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ 
            padding: "10px",
            display: "flex",
            gap: "8px",
            backgroundColor: "white",
            alignItems: "center",
            borderTop: "1px solid #f0f0f0"
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask for help or create an overlay..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                outline: "none",
                fontSize: "14px",
                backgroundColor: "#f9f9f9"
              }}
            />
            {contextItems.filter(item => item.active).length > 0 && (
              <div 
                title={`${contextItems.filter(item => item.active).length} active context items will be included`}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {contextItems.filter(item => item.active).length}
              </div>
            )}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "#2684FF",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLoading || !input.trim() ? "default" : "pointer",
                opacity: isLoading || !input.trim() ? 0.6 : 1,
                padding: 0
              }}
              title="Send message"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PersistentAIChat; 