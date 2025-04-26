import React, { useState, useRef, useEffect } from "react";
import { getOpenAIApiKey } from "./ApiKeyConfig";
import { createOverlay } from "../utils/createOverlay";
import { calculateNextPosition } from "../utils/overlayPositioning";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [overlayInstructions, setOverlayInstructions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          content: "Hello! How can I assist you today?",
          timestamp: Date.now()
        }
      ]);
    }
  }, []);

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
      
      // If overlay instructions mode is active, add the format instructions
      if (overlayInstructions) {
        formattedMessages.unshift({
          role: "system",
          content: OVERLAY_FORMAT_PROMPT
        });
      }
      
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
      if (parsedContent && parsedContent.type && ['note', 'button', 'timer', 'search'].includes(parsedContent.type)) {
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
        
        // Create the overlay
        await createOverlay(
          parsedContent.type.charAt(0).toUpperCase() + parsedContent.type.slice(1), 
          parsedContent
        );
        
        return true;
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
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };
  
  // Toggle overlay instructions mode
  const toggleOverlayMode = () => {
    setOverlayInstructions(!overlayInstructions);
    if (!overlayInstructions) {
      // Add instruction message when enabling
      setMessages([
        ...messages,
        {
          role: "assistant",
          content: "Overlay creation mode enabled. Ask me to create a specific overlay type, and I'll respond with properly formatted JSON that will be automatically saved as an overlay.",
          timestamp: Date.now()
        }
      ]);
    }
  };

  // If minimized, just show a button to expand
  if (isMinimized) {
    return (
      <div 
        onClick={toggleMinimized}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: "#2684FF",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          zIndex: 10000000,
          fontSize: "24px",
          border: "2px solid white"
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" 
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="persistent-ai-chat" style={{ 
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      border: "1px solid #2684FF",
      borderRadius: "12px",
      overflow: "hidden",
      backgroundColor: "white",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
    }}>
      {/* Top bar with minimize button */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid #f0f0f0",
        backgroundColor: "white",
        alignItems: "center"
      }}>
        <div style={{ fontWeight: "bold", color: "#333", fontSize: "16px" }}>AI Assistant</div>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Toggle overlay mode button */}
          <button 
            onClick={toggleOverlayMode}
            style={{
              background: overlayInstructions ? "#4285F4" : "none",
              color: overlayInstructions ? "white" : "#666",
              border: overlayInstructions ? "none" : "1px solid #ccc",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "12px",
              cursor: "pointer"
            }}
            title={overlayInstructions ? "Disable overlay mode" : "Enable overlay mode"}
          >
            {overlayInstructions ? "Overlay Mode ON" : "Overlay Mode"}
          </button>
          {/* Minimize button */}
          <button 
            onClick={toggleMinimized}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#666",
              padding: "2px 8px"
            }}
            title="Minimize"
          >
            —
          </button>
        </div>
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
        <div ref={messagesEndRef} />
      </div>
      
      {/* Divider line */}
      <div style={{ borderTop: "1px solid #f0f0f0" }} />
      
      {/* Input area */}
      <div style={{ 
        padding: "16px",
        display: "flex",
        gap: "12px",
        backgroundColor: "white",
        alignItems: "center"
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={overlayInstructions ? "Ask for an overlay (note, button, timer, search)..." : "Build your task..."}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "14px 18px",
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
            padding: "14px 25px",
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

export default PersistentAIChat; 