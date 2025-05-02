import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

// Supabase configuration
export const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
export const CHANNEL_NAME = "cursor-sharing-channel"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

import "./global.css"

// Interface definitions
interface User {
  username: string
  isOnline: boolean
  cursorPosition?: {
    x: number
    y: number
  }
}

function IndexPopup() {
  const [username, setUsername] = useState("")
  const [hasUsername, setHasUsername] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSharingCursor, setIsSharingCursor] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [error, setError] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  
  // Refs
  const channelRef = useRef<any>(null)
  
  // Check if username setup is needed and load existing username if available
  useEffect(() => {
    // Check if we need to prompt for username setup (from background script)
    chrome.runtime.sendMessage({ action: "check_needs_setup" }, (response) => {
      if (response && response.needsSetup) {
        setNeedsSetup(true)
      }
    })
    
    // Try to get existing username
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        setUsername(response.username)
        setHasUsername(true)
      }
    })
  }, [])

  // Check initial connection state from background
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "get_global_state" }, (response) => {
      if (response && response.state) {
        setIsConnected(response.state.isConnected);
        setIsSharingCursor(response.state.isSharingCursor);
        
        if (response.state.isConnected) {
          // Re-join the channel if we're already connected globally
          startConnection(true);
        }
      }
    });
  }, [username]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (isConnected) {
        stopConnection();
      }
    };
  }, [isConnected]);

  // Function to save username through the background script
  const saveUsername = () => {
    if (username.trim()) {
      const trimmedUsername = username.trim()
      console.log("Saving username via background:", trimmedUsername)
      
      // Send to background script to save in central storage
      chrome.runtime.sendMessage(
        { action: "set_username", username: trimmedUsername },
        (response) => {
          if (response && response.success) {
            console.log("Username saved successfully")
            setHasUsername(true)
            setNeedsSetup(false)
          }
        }
      )
    } else {
      alert("Please enter a valid username")
    }
  }

  // Update global state in background script
  const updateGlobalState = (state: { isConnected?: boolean, isSharingCursor?: boolean }) => {
    chrome.runtime.sendMessage({ 
      action: "update_global_state", 
      state 
    }, (response) => {
      console.log("Global state update response:", response);
    });
  };

  // Toggle connection
  const toggleConnection = () => {
    if (isConnected) {
      stopConnection();
    } else {
      startConnection();
    }
  };

  // Toggle cursor sharing
  const toggleCursorSharing = () => {
    // Only allow cursor sharing if connected
    if (!isConnected && !isSharingCursor) {
      console.log("Cannot share cursor without connecting first");
      return;
    }
    
    const newSharingState = !isSharingCursor;
    setIsSharingCursor(newSharingState);
    
    // Update global state
    updateGlobalState({ isSharingCursor: newSharingState });
    
    // Log for debugging
    console.log(newSharingState ? "Started cursor sharing" : "Stopped cursor sharing");
    chrome.runtime.sendMessage({ 
      action: "debug_log", 
      message: newSharingState ? "Started cursor sharing" : "Stopped cursor sharing"
    });
  };

  // Update tabs when connection is fully established
  const updateTabsConnectionStatus = (status: boolean) => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "connection_status",
            isConnected: status
          }).catch(() => {
            // Ignore errors from tabs where content script isn't loaded
          });
        }
      });
    });
  };

  // Subscribe to the channel and set up connection
  const setupChannel = async (channel) => {
    try {
      console.log('Channel status: SUBSCRIBING');
      
      // Subscribe to the channel
      const status = await new Promise<string>((resolve) => {
        channel.subscribe((status) => resolve(status));
      });
      
      console.log('Channel status:', status);
      chrome.runtime.sendMessage({ 
        action: "debug_log", 
        message: `Channel status: ${status}`
      });
      
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to channel:', CHANNEL_NAME);
        chrome.runtime.sendMessage({ 
          action: "debug_log", 
          message: `Subscribed to channel: ${CHANNEL_NAME}`
        });
        
        // Track presence
        await channel.track({
          username,
          isOnline: true
        });
        
        // Broadcast that we've joined
        const response = await channel.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: { username }
        });
        
        console.log('Broadcast response:', response);
        chrome.runtime.sendMessage({ 
          action: "debug_log", 
          message: `Broadcast response: ${response === 'ok' ? 'ok' : 'error'}`
        });
        
        // Set connection state
        setIsConnected(true);
        channelRef.current = channel;
        
        // Inform all tabs that connection is active
        updateTabsConnectionStatus(true);
        
        // Add ourselves to the online users list
        setOnlineUsers(prev => {
          if (prev.some(u => u.username === username)) {
            return prev;
          }
          return [...prev, {
            username,
            isOnline: true
          }];
        });
        
        // Request information about existing users
        setTimeout(() => {
          if (channelRef.current) {
            channel.send({
              type: 'broadcast',
              event: 'request-users',
              payload: { requester: username }
            });
          }
        }, 1000);
        
        // Clear any existing error
        setError("");
        
        return true;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error joining channel:', status);
        setError('Failed to join channel. Please try again.');
        return false;
      } else if (status === 'TIMED_OUT') {
        console.error('Channel subscription timed out');
        setError('Connection timed out. Please try again.');
        return false;
      } else if (status === 'CLOSED') {
        console.log('Channel closed');
        setIsConnected(false);
        return false;
      }
      
      return false;
    } catch (err) {
      console.error('Error in setupChannel:', err);
      return false;
    }
  };

  // Start connection to the channel
  const startConnection = async (rejoin: boolean = false) => {
    try {
      // If we're already connected, don't try to connect again unless rejoining
      if (isConnected && !rejoin) {
        console.log("Already connected, not connecting again");
        return;
      }
      
      console.log("Starting connection to channel...");
      chrome.runtime.sendMessage({ 
        action: "debug_log", 
        message: "Starting connection to channel"
      });
      
      // Join Supabase Realtime channel
      const channel = supabase.channel(CHANNEL_NAME, {
        config: {
          broadcast: {
            self: true,
            ack: true
          }
        }
      });
      
      // Listen for user joined events
      channel.on(
        'broadcast',
        { event: 'user-joined' },
        (payload) => {
          console.log('User joined:', payload);
          chrome.runtime.sendMessage({ 
            action: "debug_log", 
            message: `User joined: ${payload.payload.username}`
          });
          
          if (payload.payload.username === username) return; // Ignore our own messages
        
          // When a new user joins, add them to our list
          setOnlineUsers(prev => {
            // Check if user already exists
            if (prev.some(u => u.username === payload.payload.username)) {
              return prev;
            }
            
            // Log for debugging
            console.log(`Adding user to online list: ${payload.payload.username}`);
            chrome.runtime.sendMessage({ 
              action: "debug_log", 
              message: `Adding user to online list: ${payload.payload.username}`
            });
            
            // Add new user
            return [...prev, { 
              username: payload.payload.username, 
              isOnline: true 
            }];
          });
        }
      );
      
      // Listen for user left events
      channel.on(
        'broadcast',
        { event: 'user-left' },
        (payload) => {
          console.log('User left:', payload);
          chrome.runtime.sendMessage({ 
            action: "debug_log", 
            message: `User left: ${payload.payload.username}`
          });
          
          // Remove user from list
          setOnlineUsers(prev => 
            prev.filter(u => u.username !== payload.payload.username)
          );
        }
      );
      
      // Listen for cursor movement events
      channel.on(
        'broadcast',
        { event: 'cursor-move' },
        (payload) => {
          if (payload.payload.username === username) return; // Ignore our own messages
          
          // Extract all data
          const { username: senderUsername, position, url, pageTitle } = payload.payload;
          
          // Log cursor moves for debugging
          console.log('Cursor move received:', senderUsername, position, 
                      url ? `on page: ${url}` : 'no page info');
          
          // Broadcast to all tabs to make the cursor appear
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  action: "cursor_move",
                  username: senderUsername,
                  position: position,
                  url: url,
                  pageTitle: pageTitle
                }).catch(() => {
                  // Ignore errors from tabs where content script isn't loaded
                });
              }
            });
          });
        }
      );
      
      // Listen for presence changes
      channel.on('presence', { event: 'sync' }, () => {
        console.log('Presence sync event received');
        chrome.runtime.sendMessage({
          action: "debug_log",
          message: "Presence sync event received"
        });

        try {
          const presenceState = channel.presenceState();
          
          // Build a new users list from presence state
          const usersFromPresence: User[] = [];
          
          // Make sure we're in the list
          usersFromPresence.push({
            username,
            isOnline: true
          });
          
          // Add other users from presence state
          if (presenceState) {
            Object.entries(presenceState).forEach(([key, users]) => {
              if (Array.isArray(users)) {
                users.forEach(user => {
                  const userData = user as any;
                  // Look for username in various possible formats
                  const remoteUsername = userData.username || 
                                         (userData.payload && userData.payload.username) || 
                                         (userData.value && userData.value.username);
                  
                  if (remoteUsername && remoteUsername !== username) {
                    chrome.runtime.sendMessage({
                      action: "debug_log",
                      message: `Found user in presence: ${remoteUsername}`
                    });
                    
                    if (!usersFromPresence.some(u => u.username === remoteUsername)) {
                      usersFromPresence.push({
                        username: remoteUsername,
                        isOnline: true
                      });
                    }
                  }
                });
              }
            });
          }
          
          // Update the online users list
          if (usersFromPresence.length > 1 || onlineUsers.length <= 1) {
            setOnlineUsers(usersFromPresence);
          }
        } catch (err) {
          console.error("Error processing presence sync:", err);
          chrome.runtime.sendMessage({
            action: "debug_log",
            message: `Error processing presence sync: ${err.message}`
          });
        }
      });
      
      // Set up the channel, subscribes and updates tabs
      const success = await setupChannel(channel);
      
      if (success) {
        // Update global state to connected
        updateGlobalState({ isConnected: true });
      } else {
        console.error("Failed to set up channel");
        setError("Failed to connect to channel. Please try again.");
        setIsConnected(false);
        
        // Update global state to disconnected
        updateGlobalState({ isConnected: false });
      }
      
    } catch (err) {
      console.error('Failed to start connection:', err);
      chrome.runtime.sendMessage({ 
        action: "debug_log", 
        message: `Error starting connection: ${err.message}`
      });
      setError('Failed to establish connection. Please try again.');
      setIsConnected(false);
      
      // Update global state to disconnected
      updateGlobalState({ isConnected: false });
    }
  };
  
  // Stop connection
  const stopConnection = async () => {
    // If cursor sharing is active, stop it
    if (isSharingCursor) {
      setIsSharingCursor(false);
      
      // Update global state
      updateGlobalState({ isSharingCursor: false });
    }
    
    // Broadcast that we're leaving
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'user-left',
          payload: { username }
        });
      } catch (err) {
        console.error('Error sending leave message:', err);
      }
    }
    
    // Leave the channel
    if (channelRef.current) {
      try {
        await channelRef.current.untrack();
        await channelRef.current.unsubscribe();
      } catch (err) {
        console.error('Error leaving channel:', err);
      }
      channelRef.current = null;
    }
    
    // Clear the online users list
    setOnlineUsers([]);
    setIsConnected(false);
    
    // Update global state to disconnected
    updateGlobalState({ isConnected: false });
    
    console.log("Connection stopped");
    chrome.runtime.sendMessage({ 
      action: "debug_log", 
      message: "Connection stopped"
    });
  };
  
  // Create debug status info
  const updateDebugInfo = () => {
    if (channelRef.current) {
      try {
        // Get current presence state
        const presence = channelRef.current.presenceState();
        const totalPresenceEntries = Object.values(presence || {}).reduce(
          (sum: number, list: any) => sum + (Array.isArray(list) ? list.length : 0), 
          0
        );
        
        // Create report
        const info = `Channel: ${CHANNEL_NAME}
Status: ${isConnected ? 'Connected' : 'Disconnected'}
Presence entries: ${totalPresenceEntries}
Online users: ${onlineUsers.length}
Mouse sharing: ${isSharingCursor ? 'Active' : 'Inactive'}`;
        
        setDebugInfo(info);
      } catch (err) {
        setDebugInfo(`Error getting debug info: ${err.message}`);
      }
    } else {
      setDebugInfo("Not connected to channel");
    }
  };
  
  // Update debug info periodically
  useEffect(() => {
    if (isConnected) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, onlineUsers.length, isSharingCursor]);
  
  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveUsername();
    }
  };

  return (
    <div
      style={{
        padding: 16,
        width: 300,
        minHeight: 200
      }}>
      {!hasUsername && (
        <>
          <h2>Set Your Username</h2>
          <p>
            {needsSetup 
              ? "Welcome! Please set your username to use our cursor sharing features across all sites." 
              : "Please set your username to use our cursor sharing features."}
          </p>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your username"
                autoFocus
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 14
                }}
              />
              <button
                onClick={saveUsername}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#34A853",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 14
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
      
      {hasUsername && (
        <>
          <h2>Presence & Cursor Sharing</h2>
          <p>Your username: <strong>{username}</strong></p>
          
          {error && (
            <div style={{
              color: '#EA4335',
              marginBottom: '10px',
              fontSize: '12px',
              padding: '8px',
              backgroundColor: '#FFEBEE',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginTop: 20 }}>
            <button
              onClick={toggleConnection}
              style={{
                padding: "12px 24px",
                backgroundColor: isConnected ? "#EA4335" : "#34A853",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 12
              }}
            >
              {isConnected ? (
                <>
                  <span>Disconnect</span>
                  <span style={{ fontSize: 18 }}>🔴</span>
                </>
              ) : (
                <>
                  <span>Connect</span>
                  <span style={{ fontSize: 18 }}>🔌</span>
                </>
              )}
            </button>

            {isConnected && (
              <button
                onClick={toggleCursorSharing}
                style={{
                  padding: "12px 16px",
                  backgroundColor: isSharingCursor ? "#EA4335" : "#4285F4",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: 14,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 12
                }}
              >
                {isSharingCursor ? (
                  <>
                    <span>Stop Sharing Cursor</span>
                    <span style={{ fontSize: 18 }}>🖱️</span>
                  </>
                ) : (
                  <>
                    <span>Share Cursor</span>
                    <span style={{ fontSize: 18 }}>🖱️</span>
                  </>
                )}
              </button>
            )}

            {isConnected && (
              <div style={{ marginTop: 16 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: 4 
                }}>
                  <span style={{ fontSize: 12, fontWeight: "bold" }}>
                    Online Users:
                  </span>
                  <button 
                    onClick={updateDebugInfo}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    Refresh
                  </button>
                </div>
                <div style={{ 
                  maxHeight: 100, 
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  padding: "4px 0"
                }}>
                  {onlineUsers.length === 0 ? (
                    <div style={{ padding: "8px", color: "#666", fontSize: "12px", textAlign: "center" }}>
                      No one online yet
                    </div>
                  ) : (
                    onlineUsers.map(user => (
                      <div 
                        key={user.username}
                        style={{ 
                          padding: "6px 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #f5f5f5",
                          backgroundColor: user.username === username ? "#f5f5f5" : "transparent"
                        }}
                      >
                        <span style={{ fontSize: 12 }}>
                          {user.username}
                          {user.username === username ? ' (You)' : ''}
                        </span>
                        <span style={{ color: "#34A853", fontSize: 12 }}>
                          {isSharingCursor && user.username === username ? '🖱️' : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {debugInfo && (
              <div style={{ 
                marginTop: 12, 
                marginBottom: 12, 
                fontSize: 10, 
                backgroundColor: "#f5f5f5",
                padding: 8,
                borderRadius: 4,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 120,
                overflowY: "auto"
              }}>
                <strong>Connection Status:</strong>
                <div>{debugInfo}</div>
              </div>
            )}
          </div>

          <button
            onClick={() => window.close()}
            style={{
              padding: "8px 12px",
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
              marginTop: 16
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  )
}

export default IndexPopup
