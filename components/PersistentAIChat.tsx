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

when i start with /translate always use translate overlay format
when i start with /explain always use explain overlay format
when i start with /chat always use chat overlay format
when i start with /timer always use timer overlay format
when i start with /search always use search overlay format
when i start with /form always use form overlay format
when i start with /grid always use grid overlay format -> use data from context to populate the grid
when i start with /approval always use approval overlay format
when i start with /poll always use poll overlay format
when i start with /note always use note overlay format  -> try to sumarise wverything from context added
when i start with /button always use button overlay format


ALWAYS FIRST LOOK TO CONTEXT DATA I SENDED WITH THIS INSTRUCTION HIS NEEDS TO BE USED TO CREATE THE OVERLAY!

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

// is user asking about /email to send then use this format -> one biger input with text user provided and send input on top of this with user provided and on end put send button
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

USE THIS FORMAT FOR AN APPROVAL/SIGNATURE OVERLAY! SO IF I ASK FOR AN APPROVAL OVERLAY/ APPROVAL FORM/ SIGNATURE FORM OR SOMETHING LIKE THIS, USE THIS FORMAT!

7. For an approval/signature overlay:
{
  "type": "approval",
  "style": {
    "width": 400,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "title": "Document Approval",
  "content": "I hereby confirm that I have reviewed the document and agree to its terms and conditions.",
  "approveButtonText": "I Approve",
  "rejectButtonText": "I Reject"
}


IF I ASK FOR A POLL OVERLAY/ POLL FORM/ VOTING FORM OR SOMETHING LIKE THIS, USE THIS FORMAT!

8. For a poll with voting options:
{
  "type": "poll",
  "style": {
    "width": 450,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "title": "Team Building Poll",
  "question": "Where should we go for our next team building event?",
  "options": [
    {
      "id": "option1",
      "text": "Mountain Retreat",
      "votes": 0
    },
    {
      "id": "option2",
      "text": "Beach Resort",
      "votes": 0
    },
    {
      "id": "option3",
      "text": "City Tour",
      "votes": 0
    },
    {
      "id": "option4",
      "text": "Adventure Park",
      "votes": 0
    }
  ],
  "votedBy": [],
  "totalVotes": 0
}

9. For a translation tool:
{
  "type": "translation",
  "style": {
    "width": 450,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "sourceText": "",
  "translatedText": "",
  "sourceLang": "auto",
  "targetLang": "en",
  "history": []
}

10. For an explanation tool (ELI5 - Explain Like I'm 5):
{
  "type": "explain",
  "style": {
    "width": 450,
    "backgroundColor": "white",
    "borderRadius": "8px",
    "padding": "16px"
  },
  "inputText": "",
  "explanation": "",
  "level": "simple",
  "history": []
}


IF I ASK FOR TRANSLATION OR LANGUAGE TRANSLATION, USE FORMAT #9 ABOVE.
IF I ASK FOR EXPLANATION OR TO EXPLAIN SOMETHING, USE FORMAT #10 ABOVE.

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
  
  // Command autocomplete states
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  // Available commands
  const availableCommands = [
    '/translate',
    '/explain',
    '/note',
    '/button',
    '/timer',
    '/search',
    '/form',
    '/grid',
    '/approval',
    '/poll',
    '/email',
    '/talk',
    '/clear'
  ];
  
  // Context panel states
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [contextPanelVisible, setContextPanelVisible] = useState(false);
  const [contextInput, setContextInput] = useState("");
  const [contextItems, setContextItems] = useState<Array<{id: string, text: string, url: string, title: string, timestamp: number, expanded?: boolean, active?: boolean}>>([]);
  const contextInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Track talk mode
  const [isTalkModeActive, setIsTalkModeActive] = useState(false);

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

  // Handle input change for command autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Check if the input starts with '/' to show commands
    if (value.startsWith('/')) {
      // Get the command part (after the slash)
      const command = value.substring(1).toLowerCase();
      
      // Filter available commands that match what the user is typing
      const filtered = availableCommands.filter(cmd => 
        cmd.toLowerCase().substring(1).startsWith(command)
      );
      
      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
      setSelectedCommandIndex(0);
    } else {
      setShowCommands(false);
    }
  };
  
  // Handle keyboard navigation for command autocomplete
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommands) {
      // Handle arrow up/down for navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0);
      }
      // Handle tab or enter to select the command
      else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredCommands.length > 0) {
          e.preventDefault();
          selectCommand(filteredCommands[selectedCommandIndex]);
        }
      }
      // Close commands on escape
      else if (e.key === 'Escape') {
        setShowCommands(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Select a command from the dropdown
  const selectCommand = (command: string) => {
    setInput(command + ' ');
    setShowCommands(false);
    
    // If selecting /talk, activate talk mode immediately
    if (command === '/talk') {
      setIsTalkModeActive(true);
    } else if (command === '/clear') {
      clearChatAndContext();
      setInput('');
    } else {
      setIsTalkModeActive(false);
    }
    
    inputRef.current?.focus();
  };

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
  const callOpenAI = async (messages: any[], isTalkModeParam?: boolean) => {
    try {
      const apiKey = getOpenAIApiKey();
      
      if (!apiKey) {
        console.error("OpenAI API key not found");
        return "Error: OpenAI API key not found";
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
      
      // Determine if we're in talk mode - either from parameter or by checking input
      const isTalkMode = isTalkModeParam !== undefined 
        ? isTalkModeParam 
        : false; // We already processed the input in handleSendMessage
      
      // If overlay instructions mode is active and we're not in talk mode, add the format instructions
      if (overlayInstructions && !isTalkMode) {
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

  // Function to get a short title summary from text using ChatGPT
  const getSummaryFromText = async (text: string): Promise<string> => {
    try {
      const apiKey = getOpenAIApiKey();
      
      if (!apiKey) {
        console.error("OpenAI API key not found");
        return text.split(/\s+/)[0] || "Context"; // Fallback to first word
      }
      
      // Prepare message for OpenAI API
      const messages = [
        {
          role: "system",
          content: "You are a helpful assistant that generates short, concise titles (2-4 words) that summarize the main topic or content of a text. Respond with just the title, no additional text."
        },
        {
          role: "user",
          content: `Generate a short title (2-4 words) for this text: "${text}"`
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
          temperature: 0.7,
          max_tokens: 20
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error calling OpenAI API");
      }
      
      const data = await response.json();
      const summary = data.choices[0].message.content.trim();
      
      // If summary is empty or too long, fallback to first word
      if (!summary || summary.length > 30) {
        return text.split(/\s+/)[0] || "Context";
      }
      
      return summary;
    } catch (error) {
      console.error("Error getting summary:", error);
      return text.split(/\s+/)[0] || "Context"; // Fallback to first word
    }
  };

  // Try to parse response as JSON overlay
  const tryParseOverlay = async (content: string) => {
    try {
      console.log("Attempting to parse overlay from content:", content);
      
      // Check if content explicitly asks for a translation overlay but didn't parse as JSON
      if (content.toLowerCase().includes('translation') && 
          (content.toLowerCase().includes('overlay') || content.toLowerCase().includes('tool'))) {
        console.log("Content mentions translation overlay, trying manual creation");
        return await createTranslationOverlay();
      }
      
      // Check if content explicitly asks for an explain overlay but didn't parse as JSON
      if ((content.toLowerCase().includes('explain') || content.toLowerCase().includes('eli5')) && 
          (content.toLowerCase().includes('overlay') || content.toLowerCase().includes('tool'))) {
        console.log("Content mentions explain overlay, trying manual creation");
        return await createExplainOverlay();
      }
      
      // Try to extract JSON if it's wrapped in markdown code blocks
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
        console.log("Extracted JSON from code block:", jsonContent);
      }
      
      // Parse JSON
      console.log("Attempting to parse JSON:", jsonContent);
      const parsedContent = JSON.parse(jsonContent);
      console.log("Parsed content:", parsedContent);
      console.log("Content type:", parsedContent.type);
      
      // Check if it has the expected format
      if (parsedContent && parsedContent.type && ['note', 'button', 'timer', 'search', 'form', 'grid', 'approval', 'poll', 'translation', 'explain'].includes(parsedContent.type)) {
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

  // Create a translation overlay directly
  const createTranslationOverlay = async (targetLanguageInput?: string) => {
    try {
      console.log("Creating translation overlay directly");
      
      // Get position for the new overlay
      const { data } = await supabase.from("overlays").select();
      const position = calculateNextPosition(data || []);
      
      // Get active context to populate the overlay
      const activeContextItems = contextItems.filter(item => item.active);
      const contextText = activeContextItems.length > 0 
        ? activeContextItems.map(item => item.text).join("\n\n")
        : "";
      
      // Parse target language if provided
      let targetLang = "en"; // Default to English
      
      if (targetLanguageInput) {
        // Language code mapping for common languages
        const languageMap: {[key: string]: string} = {
          "english": "en",
          "spanish": "es",
          "french": "fr",
          "german": "de",
          "italian": "it",
          "portuguese": "pt",
          "russian": "ru",
          "chinese": "zh",
          "japanese": "ja",
          "korean": "ko",
          "arabic": "ar",
          "hindi": "hi",
          "croatian": "hr",
          "dutch": "nl",
          "swedish": "sv",
          "norwegian": "no",
          "danish": "da",
          "finnish": "fi",
          "greek": "el",
          "turkish": "tr",
          "polish": "pl",
          "czech": "cs",
          "hungarian": "hu",
          "romanian": "ro",
          "bulgarian": "bg",
          "serbian": "sr",
          "ukrainian": "uk",
          "hebrew": "he",
          "thai": "th",
          "vietnamese": "vi",
          "indonesian": "id",
          "malay": "ms"
        };
        
        // Normalize input to lowercase for matching
        const normInput = targetLanguageInput.toLowerCase().trim();
        
        // Check if directly mapped or if we can find in language map
        if (normInput.length === 2) {
          // Assuming it's already a language code
          targetLang = normInput;
        } else if (languageMap[normInput]) {
          targetLang = languageMap[normInput];
        }
      }
      
      // Create the layout
      const translationLayout = {
        type: "translation",
        style: {
          top: position.top,
          left: position.left,
          width: 450,
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "16px"
        },
        sourceText: contextText,
        translatedText: "",
        sourceLang: "auto",
        targetLang: targetLang,
        history: [],
        url: window.location.href,
        autoTranslate: contextText.length > 0 // Auto-translate if we have context
      };
      
      // Create the overlay
      const result = await createOverlayWithCurrentUsername("Translation", translationLayout);
      console.log("Translation overlay created:", result);
      
      return result !== null;
    } catch (error) {
      console.error("Error creating translation overlay:", error);
      return false;
    }
  };

  // Create an explain overlay directly
  const createExplainOverlay = async () => {
    try {
      console.log("Creating explain overlay directly");
      
      // Get position for the new overlay
      const { data } = await supabase.from("overlays").select();
      const position = calculateNextPosition(data || []);
      
      // Get active context to populate the overlay
      const activeContextItems = contextItems.filter(item => item.active);
      const contextText = activeContextItems.length > 0 
        ? activeContextItems.map(item => item.text).join("\n\n")
        : "";
      
      // Create the layout
      const explainLayout = {
        type: "explain",
        style: {
          top: position.top,
          left: position.left,
          width: 450,
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "16px"
        },
        inputText: contextText,
        explanation: "",
        level: "simple",
        history: [],
        url: window.location.href,
        autoExplain: contextText.length > 0 // Auto-explain if we have context
      };
      
      // Create the overlay
      const result = await createOverlayWithCurrentUsername("Explanation", explainLayout);
      console.log("Explain overlay created:", result);
      
      return result !== null;
    } catch (error) {
      console.error("Error creating explain overlay:", error);
      return false;
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Process input - remove /talk prefix if present
    let processedInput = input.trim();
    const isTalkMode = processedInput.startsWith('/talk');
    
    // Handle clear command
    if (processedInput.startsWith('/clear')) {
      clearChatAndContext();
      setInput("");
      return;
    }
    
    // Handle explain command directly
    if (processedInput.startsWith('/explain')) {
      setIsLoading(true);
      try {
        const success = await createExplainOverlay();
        if (success) {
          setMessages([
            ...messages,
            { 
              role: "user", 
              content: processedInput,
              timestamp: Date.now()
            },
            {
              role: "assistant",
              content: "✅ Explanation overlay created successfully! The overlay has been populated with your active context data.",
              timestamp: Date.now() + 1
            }
          ]);
        } else {
          setMessages([
            ...messages,
            { 
              role: "user", 
              content: processedInput,
              timestamp: Date.now()
            },
            {
              role: "assistant",
              content: "❌ Failed to create explanation overlay.",
              timestamp: Date.now() + 1
            }
          ]);
        }
      } catch (error) {
        console.error("Error creating explain overlay:", error);
        setMessages([
          ...messages,
          { 
            role: "user", 
            content: processedInput,
            timestamp: Date.now()
          },
          {
            role: "assistant",
            content: `❌ Error creating explanation overlay: ${error.message || "Unknown error"}`,
            timestamp: Date.now() + 1
          }
        ]);
      } finally {
        setIsLoading(false);
        setInput("");
      }
      return;
    }
    
    // Handle translate command directly
    if (processedInput.startsWith('/translate')) {
      setIsLoading(true);
      try {
        // Extract the target language from the command if present
        // Format: "/translate language"
        const languageInput = processedInput.substring(10).trim();
        
        const success = await createTranslationOverlay(languageInput);
        if (success) {
          setMessages([
            ...messages,
            { 
              role: "user", 
              content: processedInput,
              timestamp: Date.now()
            },
            {
              role: "assistant",
              content: `✅ Translation overlay created successfully! The overlay has been populated with your active context data${languageInput ? ` and set to translate to ${languageInput}` : ''}.`,
              timestamp: Date.now() + 1
            }
          ]);
        } else {
          setMessages([
            ...messages,
            { 
              role: "user", 
              content: processedInput,
              timestamp: Date.now()
            },
            {
              role: "assistant",
              content: "❌ Failed to create translation overlay.",
              timestamp: Date.now() + 1
            }
          ]);
        }
      } catch (error) {
        console.error("Error creating translation overlay:", error);
        setMessages([
          ...messages,
          { 
            role: "user", 
            content: processedInput,
            timestamp: Date.now()
          },
          {
            role: "assistant",
            content: `❌ Error creating translation overlay: ${error.message || "Unknown error"}`,
            timestamp: Date.now() + 1
          }
        ]);
      } finally {
        setIsLoading(false);
        setInput("");
      }
      return;
    }
    
    // Special handling for /form command to create form from context
    if (processedInput.startsWith('/form') && !isTalkMode) {
      // Extract form instructions - everything after /form
      const formRequest = processedInput.substring(5).trim();
      
      // Get active context items to use as data for the form
      const activeContextItems = contextItems.filter(item => item.active);
      
      if (activeContextItems.length === 0) {
        // If no context items, add a message suggesting to add context
        setMessages([
          ...messages,
          { 
            role: "user", 
            content: processedInput,
            timestamp: Date.now()
          },
          {
            role: "assistant",
            content: "Please add some context items and make them active before creating a form overlay. The AI will use the context to generate appropriate form fields.",
            timestamp: Date.now() + 1
          }
        ]);
        setInput("");
        return;
      }
      
      const contextData = activeContextItems.map(item => item.text).join("\n\n");
      
      // Transform the input to specifically request form overlay with context data
      const enhancedInput = `/form ${formRequest}\n\nUSE THIS CONTEXT DATA TO POPULATE THE FORM FIELDS: ${contextData}\n\nAnalyze the context and create appropriate form fields based on this data. Include all necessary fields that would be relevant for collecting information related to this context.`;
      
      // Add user message
      const newMessages = [
        ...messages, 
        { 
          role: "user", 
          content: enhancedInput,
          timestamp: Date.now()
        }
      ];
      
      // Update state and clear input
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);
      
      try {
        // Call OpenAI
        const aiResponse = await callOpenAI(newMessages, false);
        
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
        
        // Try to parse the response as an overlay
        const isOverlay = await tryParseOverlay(aiResponse);
        
        // If successfully created an overlay, add confirmation message
        if (isOverlay) {
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",
              content: "✅ Form overlay created successfully! The AI has generated form fields based on your context data.",
              timestamp: Date.now() + 1
            }
          ]);
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
      return;
    }
    
    if (isTalkMode) {
      // Remove the /talk prefix and any spaces that follow
      processedInput = processedInput.substring(5).trim();
      
      // If there's nothing left after removing /talk, don't send
      if (!processedInput) {
        setInput("");
        return;
      }
      
      // Set talk mode as active
      setIsTalkModeActive(true);
    }
    
    let newProcessedInput = processedInput;
    // Special handling for /grid command
    if (processedInput.startsWith('/grid') && !isTalkMode) {
      // Extract user's grid request - everything after /grid
      const gridRequest = processedInput.substring(5).trim();
      
      // Get active context items to use as data for the grid
      const activeContextItems = contextItems.filter(item => item.active);
      const contextData = activeContextItems.length > 0 
        ? "USE THIS CONTEXT DATA TO POPULATE THE GRID: " + 
          activeContextItems.map(item => item.text).join("\n\n")
        : "";
      
      // Transform the input to specifically request grid overlay with context data
      newProcessedInput = `/grid ${gridRequest}\n\n${contextData}`;
    }
    
    // Add user message
    const newMessages = [
      ...messages, 
      { 
        role: "user", 
        content: newProcessedInput,
        timestamp: Date.now()
      }
    ];
    
    // Update state and clear input
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    
    try {
      // Call OpenAI
      const aiResponse = await callOpenAI(newMessages, isTalkMode || isTalkModeActive);
      
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
      if (overlayInstructions && !isTalkMode && !isTalkModeActive) {
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
        setIsTalkModeActive(false); // Reset talk mode when minimizing
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
  const addContextItem = async () => {
    if (!contextInput.trim()) return;
    
    const currentUrl = window.location.href;
    
    // Set loading state if needed
    setIsLoading(true);
    
    try {
      // Get a summary from ChatGPT to use as title
      const title = await getSummaryFromText(contextInput.trim());
      
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
    } catch (error) {
      console.error("Error adding context item:", error);
      
      // Fallback to using first word as title if summary fails
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
    } finally {
      setIsLoading(false);
    }
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

  // Clear chat history and context items
  const clearChatAndContext = () => {
    // Clear chat messages except for the initial welcome message
    setMessages([
      {
        role: "assistant",
        content: "Chat history and context cleared. What would you like to do next?",
        timestamp: Date.now()
      }
    ]);
    
    // Clear context items
    setContextItems([]);
    localStorage.setItem('contextItems', JSON.stringify([]));
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
            top: "20px",
            right: "20px",
            width: "450px",
            maxWidth: "90vw",
            height: "450px",
            maxHeight: "80vh",
            backgroundColor: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: "12px",
            zIndex: 10000010,
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
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                outline: "none",
                fontSize: "14px",
                backgroundColor: isLoading ? "#f0f0f0" : "white"
              }}
            />
            
            <button
              onClick={addContextItem}
              disabled={isLoading || !contextInput.trim()}
              style={{
                padding: "8px 12px",
                backgroundColor: isLoading ? "#ccc" : "#4285f4",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {isLoading ? "Adding..." : "Add"}
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
            width: "450px",
            maxWidth: "90vw",
            height: "500px",
            maxHeight: "80vh",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000010,
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
          
          {/* Chat mode indicator */}
          {isTalkModeActive && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: "#2196f3",
              color: "white",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "center",
              zIndex: 1
            }}>
              Conversation Mode - No Overlays
            </div>
          )}

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              paddingTop: isTalkModeActive ? "50px" : "40px",
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

          {/* Input area with command autocomplete */}
          <div style={{ 
            padding: "10px",
            display: "flex",
            gap: "8px",
            backgroundColor: "white",
            alignItems: "center",
            borderTop: "1px solid #f0f0f0",
            position: "relative"  // Add this for absolute positioning of the dropdown
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={isTalkModeActive ? "Chat conversation mode (no overlays)..." : "Ask for help or create an overlay..."}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "20px",
                border: "1px solid #e0e0e0",
                outline: "none",
                fontSize: "14px",
                backgroundColor: isTalkModeActive ? "#e6f7ff" : "#f9f9f9"
              }}
            />
            
            {/* Command autocomplete dropdown */}
            {showCommands && (
              <div
                style={{
                  position: "absolute",
                  bottom: "60px",
                  left: "10px",
                  width: "calc(100% - 20px)",
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  border: "1px solid #eee"
                }}
              >
                {filteredCommands.map((command, index) => (
                  <div
                    key={command}
                    onClick={() => selectCommand(command)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      backgroundColor: index === selectedCommandIndex ? "#f0f0f0" : "transparent",
                      borderBottom: index === filteredCommands.length - 1 ? "none" : "1px solid #f5f5f5",
                      fontSize: "14px"
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#2684FF" }}>{command}</span>
                    <span style={{ fontSize: "12px", color: "#888", marginLeft: "8px" }}>
                      {command === '/translate' && "Create a translation overlay"}
                      {command === '/explain' && "Create an explain like I'm 5 overlay"}
                      {command === '/note' && "Create a simple note overlay"}
                      {command === '/button' && "Create a button overlay"}
                      {command === '/timer' && "Create a timer overlay"}
                      {command === '/search' && "Create a search overlay"}
                      {command === '/form' && "Create a form overlay from context data"}
                      {command === '/grid' && "Create a data grid overlay from context data"}
                      {command === '/approval' && "Create an approval overlay from context data"}
                      {command === '/poll' && "Create a poll overlay from context data"}
                      {command === '/email' && "Create an email overlay from context data"}
                      {command === '/talk' && "Just have a regular chat conversation"}
                      {command === '/clear' && "Clear chat history and context items"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
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