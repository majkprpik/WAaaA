import React, { useState, useRef, useEffect } from "react";
import type { OverlayLayout, NoteLayout, ButtonLayout, TimerLayout, SearchLayout, ChatAiLayout } from "../utils/createOverlay";
import DynamicOverlay from "../DynamicOverlay";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIApiKey, saveOpenAIApiKey } from "./ApiKeyConfig";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Temporary placeholder components - these will be implemented fully later
const BaseCustomOverlay: React.FC<any> = ({ 
  id, 
  style, 
  url, 
  zIndex, 
  onDelete, 
  onPin, 
  children 
}) => {
  const [isPinned, setIsPinned] = useState(url === "" || !url);
  const [position, setPosition] = useState({
    top: typeof style.top === 'number' ? style.top : 0,
    left: typeof style.left === 'number' ? style.left : 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Refs to store event handlers
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  
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
    padding: "16px",
    minWidth: "150px",
    minHeight: "40px",
    display: "flex",
    flexDirection: "column",
    cursor: isDragging ? "grabbing" : "grab",
    transition: isDragging ? "none" : "box-shadow 0.2s ease"
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
          gap: "4px"
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
      
      {/* Content */}
      <div style={{ marginTop: "20px" }}>
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

const TimerOverlay: React.FC<any> = (props) => (
  <BaseCustomOverlay {...props}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>
        {Math.floor(props.duration / 60)}:{(props.duration % 60).toString().padStart(2, '0')}
      </div>
      <div style={{ marginTop: "8px" }}>
        <button 
          style={{ 
            backgroundColor: "#4285F4", 
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "4px 12px",
            cursor: "pointer"
          }}
        >
          Start
        </button>
      </div>
    </div>
  </BaseCustomOverlay>
);

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
            color={buttonLayout.color}
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
        
      default:
        console.warn(`Unsupported overlay type: ${layout.type}`);
        return null;
    }
  }
  
  console.error("Unknown overlay format:", layout);
  return null;
};

export default OverlayFactory;