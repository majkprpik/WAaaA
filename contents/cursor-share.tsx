import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { createClient } from "@supabase/supabase-js"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Supabase configuration
const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
const CHANNEL_NAME = "cursor-sharing-channel"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Content script for handling cursor sharing
let isConnected = false
let isSharingCursor = false
let cursorElements: {[key: string]: HTMLElement} = {}
let channelSubscription: any = null
let username: string = ""
let lastPosition: {x: number, y: number} | null = null
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null
let trackingInterval: number | null = null
let onlineUsers: string[] = []
// Track user URLs and page titles
let userPages: {[username: string]: {url: string, pageTitle: string}} = {}

// Get current page URL
const currentUrl = window.location.href;
const currentPageTitle = document.title;

// Initialize and check connection state from background
function initializeConnectionState() {
  chrome.runtime.sendMessage({ action: "get_global_state" }, (response) => {
    if (response && response.state) {
      const { isConnected: newConnected, isSharingCursor: newSharing } = response.state;
      
      console.log("[Cursor Share] Initializing with global state:", response.state);
      
      // Only update if different from current state
      if (newConnected !== isConnected) {
        handleConnectionChange(newConnected);
      }
      
      // Only update cursor sharing if different from current state
      if (newSharing !== isSharingCursor) {
        handleCursorSharingChange(newSharing);
      }
    }
  });
}

// Handle connection state change
function handleConnectionChange(newConnected: boolean) {
  const wasConnected = isConnected;
  isConnected = newConnected;
  
  console.log("[Cursor Share] Connection state changed:", isConnected);
  
  if (isConnected && !wasConnected) {
    // Connect to channel
    subscribeToChannel();
    removeOwnCursor();
  } else if (!isConnected && wasConnected) {
    // Disconnect from channel
    unsubscribeFromChannel();
    stopTrackingCursor();
    removeCursors();
  }
}

// Handle cursor sharing state change
function handleCursorSharingChange(newSharing: boolean) {
  isSharingCursor = newSharing;
  
  console.log("[Cursor Share] Cursor sharing state changed:", isSharingCursor);
  
  if (isSharingCursor && isConnected) {
    startTrackingCursor();
  } else {
    stopTrackingCursor();
  }
}

// Initialize and check if we have a username
chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
  if (response && response.username) {
    username = response.username
    console.log("[Cursor Share] Initialized with username:", username)
    
    // Remove own cursor if it exists for some reason
    removeOwnCursor()
    
    // Initialize connection state
    initializeConnectionState()
  }
})

// Listen for messages about cursor positions from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Global state updates
  if (message.action === "global_state_update") {
    console.log("[Cursor Share] Received global state update:", message.state);
    
    const { isConnected: newConnected, isSharingCursor: newSharing } = message.state;
    
    // Update connection state if different
    if (newConnected !== isConnected) {
      handleConnectionChange(newConnected);
    }
    
    // Update cursor sharing state if different
    if (newSharing !== isSharingCursor) {
      handleCursorSharingChange(newSharing);
    }
    
    sendResponse({ success: true });
    return true;
  }

  // Username updates
  if (message.action === "username_updated") {
    const oldUsername = username;
    username = message.username;
    console.log("[Cursor Share] Username updated:", username);
    
    // If we had our own cursor displayed (should not happen normally), remove it
    if (cursorElements[oldUsername]) {
      if (cursorElements[oldUsername].parentNode) {
        cursorElements[oldUsername].parentNode.removeChild(cursorElements[oldUsername]);
      }
      delete cursorElements[oldUsername];
    }
    
    sendResponse({ success: true });
    return true;
  }

  // Cursor positions from other users
  if (message.action === "cursor_move") {
    const senderUsername = message.username;
    
    // Log for debugging
    console.log(`[Cursor Share] Received cursor_move event for user: ${senderUsername}, our username: ${username}`);
    
    // Make sure we don't display our own cursor
    if (senderUsername === username) {
      console.log(`[Cursor Share] Ignoring own cursor from message`);
      removeOwnCursor();
      sendResponse({ success: true });
      return true;
    }
    
    handleCursorMove(
      senderUsername, 
      message.position, 
      message.url, 
      message.pageTitle
    );
    sendResponse({ success: true });
  }
  
  // Online users updates
  if (message.action === "online_users_update") {
    console.log("[Cursor Share] Received online users update:", message.users);
    onlineUsers = message.users;
    sendResponse({ success: true });
    return true;
  }
  
  // Forward console logs from popup to console
  if (message.action === "console_log") {
    console.log(`[${message.source || "Extension"}]`, message.message)
    sendResponse({ success: true });
  }
  
  return true; // Required for async response
})

// Start tracking cursor movements
function startTrackingCursor() {
  if (!isConnected || !username || mouseMoveHandler) return
  
  console.log("[Cursor Share] Starting cursor tracking")
  
  // Make sure own cursor is not displayed
  removeOwnCursor()
  
  // Create mouse move handler
  mouseMoveHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event
    
    // Only broadcast if position changed significantly
    if (lastPosition) {
      const { x: lastX, y: lastY } = lastPosition
      const distance = Math.sqrt(Math.pow(clientX - lastX, 2) + Math.pow(clientY - lastY, 2))
      
      // Only send if moved at least 3 pixels
      if (distance < 3) return
    }
    
    // Broadcast position
    broadcastCursorPosition(clientX, clientY);
  }
  
  // Add mouse move listener
  document.addEventListener('mousemove', mouseMoveHandler)
  
  // Set up interval to periodically check connection and resend position
  trackingInterval = window.setInterval(() => {
    if (lastPosition && channelSubscription && isConnected) {
      // Resend using the broadcast function
      broadcastCursorPosition(lastPosition.x, lastPosition.y);
    }
  }, 3000) as unknown as number
}

// Stop tracking cursor movements
function stopTrackingCursor() {
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler)
    mouseMoveHandler = null
  }
  
  if (trackingInterval) {
    clearInterval(trackingInterval)
    trackingInterval = null
  }
  
  lastPosition = null
  console.log("[Cursor Share] Stopped cursor tracking")
}

// Subscribe to the Supabase channel
function subscribeToChannel() {
  // If already subscribed, do nothing
  if (channelSubscription) return
  
  try {
    console.log("[Cursor Share] Subscribing to channel:", CHANNEL_NAME);
    
    // Join Supabase Realtime channel
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: {
          self: false,
          ack: true
        }
      }
    })
    
    // Listen for cursor movement events
    channel.on('broadcast', { event: 'cursor-move' }, (payload) => {
      console.log("[Cursor Share] Received cursor movement broadcast:", payload);
      if (payload.payload && payload.payload.username && payload.payload.position) {
        // Extract all data
        const { username: senderUsername, position, url, pageTitle } = payload.payload;
        
        // Handle cursor movement
        handleCursorMove(senderUsername, position, url, pageTitle);
      } else {
        console.error("[Cursor Share] Invalid cursor movement payload:", payload);
      }
    })
    
    // Listen for user events
    channel.on('broadcast', { event: 'user-joined' }, (payload) => {
      console.log("[Cursor Share] User joined channel:", payload);
      
      // Update online users list
      if (payload.payload && payload.payload.username) {
        const joinedUsername = payload.payload.username;
        
        // Add to online users if not already present
        if (!onlineUsers.includes(joinedUsername)) {
          const newUsers = [...onlineUsers, joinedUsername];
          onlineUsers = newUsers;
          
          // Notify background script of updated users
          chrome.runtime.sendMessage({
            action: "update_online_users",
            users: newUsers
          });
        }
      }
    })
    
    channel.on('broadcast', { event: 'user-left' }, (payload) => {
      console.log("[Cursor Share] User left channel:", payload);
      
      // Remove their cursor if they left
      if (payload.payload && payload.payload.username) {
        const leftUsername = payload.payload.username;
        
        // Remove from cursors
        if (cursorElements[leftUsername]) {
          if (cursorElements[leftUsername].parentNode) {
            cursorElements[leftUsername].parentNode.removeChild(cursorElements[leftUsername]);
          }
          delete cursorElements[leftUsername];
        }
        
        // Remove from online users
        const newUsers = onlineUsers.filter(u => u !== leftUsername);
        if (newUsers.length !== onlineUsers.length) {
          onlineUsers = newUsers;
          
          // Notify background script
          chrome.runtime.sendMessage({
            action: "update_online_users",
            users: newUsers
          });
        }
      }
    })
    
    // Listen for presence events
    channel.on('presence', { event: 'sync' }, () => {
      try {
        console.log("[Cursor Share] Presence sync");
        const presenceState = channel.presenceState();
        
        // Get usernames from presence state
        const usersFromPresence: string[] = [];
        
        // Include ourselves
        if (username) {
          usersFromPresence.push(username);
          
          // Add our own page info
          userPages[username] = { url: currentUrl, pageTitle: currentPageTitle };
        }
        
        // Process presence data
        if (presenceState) {
          Object.entries(presenceState).forEach(([key, users]) => {
            if (Array.isArray(users)) {
              users.forEach((userData: any) => {
                // Extract username from various possible formats
                const presenceUsername = userData.username || 
                                       (userData.payload && userData.payload.username) || 
                                       (userData.value && userData.value.username);
                
                if (presenceUsername && !usersFromPresence.includes(presenceUsername)) {
                  usersFromPresence.push(presenceUsername);
                  
                  // Extract URL and page title if available
                  const presenceUrl = userData.url || 
                                    (userData.payload && userData.payload.url) || 
                                    (userData.value && userData.value.url);
                  const presencePageTitle = userData.pageTitle || 
                                         (userData.payload && userData.payload.pageTitle) || 
                                         (userData.value && userData.value.pageTitle);
                  
                  // Update user page info if available
                  if (presenceUrl && presencePageTitle) {
                    userPages[presenceUsername] = { url: presenceUrl, pageTitle: presencePageTitle };
                  }
                }
              });
            }
          });
        }
        
        // Update online users if changed
        if (JSON.stringify(usersFromPresence) !== JSON.stringify(onlineUsers)) {
          onlineUsers = usersFromPresence;
          
          // Notify background script
          chrome.runtime.sendMessage({
            action: "update_online_users",
            users: usersFromPresence,
            userPages: userPages // Include page information
          });
        }
      } catch (err) {
        console.error("[Cursor Share] Error processing presence:", err);
      }
    });
    
    // Subscribe to the channel
    channel.subscribe(async (status) => {
      console.log("[Cursor Share] Channel subscription status:", status);
      
      if (status === 'SUBSCRIBED') {
        console.log("[Cursor Share] Successfully subscribed to channel");
        
        // Join the presence
        await channel.track({
          username,
          online: true,
          url: currentUrl
        });
        
        // Broadcast that we've joined
        await channel.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: { 
            username,
            url: currentUrl,
            pageTitle: currentPageTitle
          }
        });
      }
    });
    
    // Save the channel reference
    channelSubscription = channel
    
    console.log("[Cursor Share] Successfully subscribed to channel:", CHANNEL_NAME)
    
    // If cursor sharing was enabled, start tracking
    if (isSharingCursor) {
      startTrackingCursor()
    }
  } catch (err) {
    console.error("[Cursor Share] Error subscribing to channel:", err)
  }
}

// Unsubscribe from the Supabase channel
function unsubscribeFromChannel() {
  if (channelSubscription) {
    try {
      // Broadcast that we're leaving if still connected
      channelSubscription.send({
        type: 'broadcast',
        event: 'user-left',
        payload: { username }
      }).catch(err => {
        console.error("[Cursor Share] Error sending leave message:", err);
      });
      
      // Untrack presence
      channelSubscription.untrack();
      
      // Unsubscribe
      channelSubscription.unsubscribe()
      channelSubscription = null
      console.log("[Cursor Share] Unsubscribed from channel")
    } catch (err) {
      console.error("[Cursor Share] Error unsubscribing from channel:", err)
    }
  }
}

// Function to broadcast cursor position
function broadcastCursorPosition(clientX: number, clientY: number) {
  // Calculate position as percentage of window size for better cross-browser compatibility
  const positionData = { 
    x: clientX / window.innerWidth, 
    y: clientY / window.innerHeight
  }
  
  // Update last position
  lastPosition = { x: clientX, y: clientY }
  
  // Broadcast to channel if connected
  if (channelSubscription) {
    try {
      channelSubscription.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: { 
          username,
          position: positionData,
          url: currentUrl,
          pageTitle: currentPageTitle
        }
      })
    } catch (err) {
      console.error("[Cursor Share] Error sending cursor position:", err)
    }
  }
}

// Listen for cursor movement events from other users
function handleCursorMove(cursorUsername: string, position: {x: number, y: number}, userUrl?: string, pageTitle?: string) {
  // Skip if not connected
  if (!isConnected) return
  
  // Skip if this is our own cursor
  if (cursorUsername === username) {
    console.log(`[Cursor Share] Ignoring own cursor movement`);
    return;
  }
  
  // Update user page information if provided
  if (userUrl && pageTitle) {
    userPages[cursorUsername] = { url: userUrl, pageTitle: pageTitle };
    
    // Notify background script about updated user page
    chrome.runtime.sendMessage({
      action: "update_user_page",
      username: cursorUsername,
      url: userUrl,
      pageTitle: pageTitle
    }).catch(() => {
      // Ignore errors if background script isn't ready
    });
  }
  
  const isOnDifferentPage = userUrl && userUrl !== currentUrl;
  
  console.log(`[Cursor Share] Handling cursor move for ${cursorUsername}:`, position, 
              isOnDifferentPage ? `on different page: ${userUrl}` : 'on same page');
  
  // Create cursor element if it doesn't exist
  if (!cursorElements[cursorUsername]) {
    console.log(`[Cursor Share] Creating new cursor element for ${cursorUsername}`);
    const cursorElement = document.createElement("div")
    cursorElement.style.position = "fixed"
    cursorElement.style.pointerEvents = "none"
    cursorElement.style.zIndex = "9999999"
    cursorElement.style.transition = "transform 0.1s ease"
    cursorElement.style.transform = "translate(0, 0)"
    cursorElement.style.left = "0"
    cursorElement.style.top = "0"
    
    // Create cursor HTML with different styling based on whether they're on same page
    let cursorHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${isOnDifferentPage ? '#EA4335' : '#4285F4'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        opacity: 0.9;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        position: relative;
      ">
        ${cursorUsername.charAt(0).toUpperCase()}
      </div>
      <div style="
        margin-top: 4px;
        background-color: #333;
        color: white;
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0.9;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        max-width: 250px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${cursorUsername}
      </div>
    `;
    
    // Add URL info if on different page
    if (isOnDifferentPage && pageTitle) {
      cursorHTML += `
        <div style="
          margin-top: 2px;
          background-color: #EA4335;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0.9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${pageTitle || 'Other page'}
        </div>
      `;
    }
    
    cursorElement.innerHTML = cursorHTML;
    document.body.appendChild(cursorElement)
    cursorElements[cursorUsername] = cursorElement
  } else {
    // Update the cursor element if URL status changed
    const cursorElement = cursorElements[cursorUsername];
    const cursorDot = cursorElement.querySelector('div:first-child') as HTMLElement;
    
    // Update dot color based on page status
    if (cursorDot) {
      cursorDot.style.backgroundColor = isOnDifferentPage ? '#EA4335' : '#4285F4';
    }
    
    // Check if we need to add or remove URL info
    const urlInfo = cursorElement.querySelector('div:nth-child(3)');
    
    if (isOnDifferentPage && pageTitle) {
      if (!urlInfo) {
        const urlElement = document.createElement('div');
        urlElement.style.marginTop = '2px';
        urlElement.style.backgroundColor = '#EA4335';
        urlElement.style.color = 'white';
        urlElement.style.fontSize = '10px';
        urlElement.style.padding = '2px 6px';
        urlElement.style.borderRadius = '4px';
        urlElement.style.whiteSpace = 'nowrap';
        urlElement.style.opacity = '0.9';
        urlElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        urlElement.style.maxWidth = '250px';
        urlElement.style.overflow = 'hidden';
        urlElement.style.textOverflow = 'ellipsis';
        urlElement.textContent = pageTitle || 'Other page';
        cursorElement.appendChild(urlElement);
      } else if (urlInfo instanceof HTMLElement) {
        urlInfo.textContent = pageTitle || 'Other page';
      }
    } else if (!isOnDifferentPage && urlInfo) {
      urlInfo.remove();
    }
  }
  
  // Update position (using percentage of window size)
  const x = position.x * window.innerWidth
  const y = position.y * window.innerHeight
  
  // Apply position using transform for better performance
  cursorElements[cursorUsername].style.transform = `translate(${x}px, ${y}px)`
  
  console.log(`[Cursor Share] Updated cursor position for ${cursorUsername} to:`, x, y);
  
  // Refresh cursor after a short delay (helps with rendering issues)
  setTimeout(() => {
    if (cursorElements[cursorUsername]) {
      const currentTransform = cursorElements[cursorUsername].style.transform;
      cursorElements[cursorUsername].style.transform = currentTransform;
    }
  }, 50);
}

// Remove all cursor elements
function removeCursors() {
  Object.values(cursorElements).forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })
  
  cursorElements = {}
}

// Remove your own cursor if it's being displayed
function removeOwnCursor() {
  if (username && cursorElements[username]) {
    console.log("[Cursor Share] Removing own cursor");
    if (cursorElements[username].parentNode) {
      cursorElements[username].parentNode.removeChild(cursorElements[username]);
    }
    delete cursorElements[username];
  }
}

// Clean up when page is unloaded
window.addEventListener("beforeunload", () => {
  if (isConnected) {
    unsubscribeFromChannel()
  }
  stopTrackingCursor()
  removeCursors()
})

// Request current global state on load
setTimeout(() => {
  chrome.runtime.sendMessage({ action: "get_global_state" }, (response) => {
    if (response && response.state) {
      console.log("[Cursor Share] Loading global state on page load:", response.state);
      
      const { isConnected: newConnected, isSharingCursor: newSharing } = response.state;
      
      // Update connection state if different
      if (newConnected !== isConnected) {
        handleConnectionChange(newConnected);
      }
      
      // Update cursor sharing state if different
      if (newSharing !== isSharingCursor) {
        handleCursorSharingChange(newSharing);
      }
    }
  });
}, 500); // Short delay to ensure background script is ready

export default {} 