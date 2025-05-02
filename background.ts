// Background script for the extension
// This script runs in the background and handles username setup and management

import { Storage } from "@plasmohq/storage"
import { createClient } from "@supabase/supabase-js"

// Create a storage instance for the extension
const storage = new Storage()

// Debug flag to enable detailed logging
const DEBUG = true

// Supabase configuration
const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
const CHANNEL_NAME = "cursor-sharing-channel"

// Global connection state
let globalConnectionState = {
  isConnected: false,
  isSharingCursor: false
}

// Track online users
let onlineUsers: string[] = []

// Track user page information
let userPages: {[username: string]: {url: string, pageTitle: string}} = {}

// Remove spatial audio tracking
// let cursorPositions: {[username: string]: {x: number, y: number}} = {}

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed or updated:", details.reason)

  if (details.reason === "install") {
    console.log("This is a first install, showing username setup")
    
    // Remove microphone permission request
    // try {
    //   const hasPermission = await new Promise<boolean>((resolve) => {
    //     chrome.permissions.contains({ permissions: ['microphone'] }, (result) => {
    //       resolve(result);
    //     });
    //   });
    //   
    //   if (!hasPermission) {
    //     console.log("Requesting microphone permission");
    //     chrome.permissions.request({ permissions: ['microphone'] }, (granted) => {
    //       console.log("Microphone permission granted:", granted);
    //     });
    //   } else {
    //     console.log("Microphone permission already granted");
    //   }
    // } catch (err) {
    //   console.error("Error requesting permissions:", err);
    // }
    
    // Open the popup to prompt for username
    chrome.action.openPopup()
    
    // Set a flag to indicate setup is needed
    await storage.set("needs_username_setup", true)
  }
})

// When a new tab is created, send it the current connection state
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && globalConnectionState.isConnected) {
    setTimeout(() => {
      // Give the content script time to load
      chrome.tabs.sendMessage(tab.id, {
        action: "global_state_update",
        state: globalConnectionState
      }).catch(() => {
        // Content script may not be loaded yet, that's okay
      })
      
      // Also send online users
      chrome.tabs.sendMessage(tab.id, {
        action: "online_users_update",
        users: onlineUsers,
        userPages: userPages
      }).catch(() => {
        // Content script may not be loaded yet, that's okay
      })
    }, 1000)
  }
})

// Forward debug messages to active tab console
function forwardDebugMessage(message: string) {
  if (!DEBUG) return;
  
  console.log("[EXTENSION DEBUG]", message);
  
  // Find active tab and forward the message for console output there
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "console_log",
        source: "background",
        message: message
      }).catch(() => {
        // Ignore errors as the content script might not be loaded
      });
    }
  });
}

// Update connection state and notify all tabs
function updateGlobalConnectionState(newState: Partial<typeof globalConnectionState>) {
  // Update the global state
  globalConnectionState = {
    ...globalConnectionState,
    ...newState
  }
  
  console.log("Global connection state updated:", globalConnectionState)
  
  // Broadcast new state to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: "global_state_update",
          state: globalConnectionState
        }).catch(() => {
          // Ignore errors from tabs where content script isn't loaded
        })
      }
    })
  })
}

// Update online users and notify all tabs
function updateOnlineUsers(users: string[], pages?: {[username: string]: {url: string, pageTitle: string}}) {
  onlineUsers = [...users]
  
  // Update page information if provided
  if (pages) {
    userPages = { ...pages }
  }
  
  console.log("Online users updated:", onlineUsers)
  console.log("User pages updated:", userPages)
  
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: "online_users_update",
          users: onlineUsers,
          userPages: userPages
        }).catch(() => {
          // Ignore errors from tabs where content script isn't loaded
        })
      }
    })
  })
}

// Update a single user's page information
function updateUserPage(username: string, url: string, pageTitle: string) {
  // Update the page information for this user
  userPages[username] = { url, pageTitle }
  
  console.log(`Updated page info for ${username}:`, { url, pageTitle })
  
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: "user_page_update",
          username,
          url,
          pageTitle
        }).catch(() => {
          // Ignore errors from tabs where content script isn't loaded
        })
      }
    })
  })
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get_username") {
    // Return username from storage
    storage.get("overlay_username").then(username => {
      sendResponse({ username: username || null })
    })
    return true // Required for async response
  }
  
  if (message.action === "set_username") {
    // Set username in storage
    storage.set("overlay_username", message.username).then(() => {
      // Clear setup flag
      storage.set("needs_username_setup", false).then(() => {
        // Broadcast to all tabs that username has been set
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { 
                action: "username_updated", 
                username: message.username 
              }).catch(err => {
                // Ignore errors from tabs that don't have listeners
                console.log("Could not send to tab:", tab.id)
              })
            }
          })
        })
        sendResponse({ success: true })
      })
    })
    return true // Required for async response
  }
  
  if (message.action === "check_needs_setup") {
    // Check if username setup is needed
    storage.get("needs_username_setup").then(needsSetup => {
      sendResponse({ needsSetup: needsSetup || false })
    })
    return true // Required for async response
  }
  
  if (message.action === "get_global_state") {
    // Return the current global connection state
    sendResponse({ state: globalConnectionState })
    return true
  }
  
  if (message.action === "update_global_state") {
    // Update the global connection state
    updateGlobalConnectionState(message.state)
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === "update_online_users") {
    // Update the online users list
    if (message.users && Array.isArray(message.users)) {
      updateOnlineUsers(message.users, message.userPages)
    }
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === "update_user_page") {
    // Update a single user's page information
    if (message.username && message.url && message.pageTitle) {
      updateUserPage(message.username, message.url, message.pageTitle)
    }
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === "toggle_connection") {
    // Toggle connection state based on value
    updateGlobalConnectionState({ isConnected: message.value })
    sendResponse({ success: true })
    return true
  }
  
  if (message.action === "toggle_cursor_sharing") {
    // Toggle cursor sharing state based on value
    updateGlobalConnectionState({ isSharingCursor: message.value })
    sendResponse({ success: true })
    return true
  }
  
  // Remove voice signaling handling
  // if (message.action === "send_voice_signaling") {
  //   // Forward voice signaling to all tabs
  //   if (message.message) {
  //     console.log("Forwarding voice signaling message:", message.message)
  //     
  //     // Broadcast to all tabs except the sender
  //     chrome.tabs.query({}, (tabs) => {
  //       tabs.forEach(tab => {
  //         if (tab.id && (!sender.tab || tab.id !== sender.tab.id)) {
  //           chrome.tabs.sendMessage(tab.id, {
  //             action: "voice_signaling",
  //             message: message.message
  //           }).catch(err => {
  //             // Ignore errors from tabs that don't have listeners
  //           })
  //         }
  //       })
  //     })
  //   }
  //   sendResponse({ success: true })
  //   return true
  // }
  
  // Remove voice status update handling
  // if (message.action === "update_voice_status") {
  //   // Broadcast voice status to all tabs
  //   if (message.username) {
  //     console.log("Broadcasting voice status update:", message.username, message.isMicrophoneActive, message.isMuted)
  //     
  //     // Send status to all tabs
  //     chrome.tabs.query({}, (tabs) => {
  //       tabs.forEach(tab => {
  //         if (tab.id) {
  //           chrome.tabs.sendMessage(tab.id, {
  //             action: "voice_status_update",
  //             username: message.username,
  //             isMicrophoneActive: message.isMicrophoneActive,
  //             isMuted: message.isMuted
  //           }).catch(err => {
  //             // Ignore errors from tabs that don't have listeners
  //           })
  //         }
  //       })
  //     })
  //   }
  //   sendResponse({ success: true })
  //   return true
  // }
  
  // Remove spatial position update handling
  // if (message.action === "update_spatial_position") {
  //   // Store user position for spatial audio
  //   if (message.username && message.position) {
  //     cursorPositions[message.username] = message.position
  //   }
  //   sendResponse({ success: true })
  //   return true
  // }
  
  // Forward cursor movement from one tab to all other tabs
  if (message.action === "broadcast_cursor_move") {
    if (message.username && message.position) {
      // Don't allow tabs to fake being a different user
      // If sender tab has a tab.id, use this as safety check
      if (sender.tab && sender.tab.id) {
        // Update user page information
        if (message.url && message.pageTitle) {
          userPages[message.username] = {
            url: message.url,
            pageTitle: message.pageTitle
          }
        }
        
        // Forward to all tabs except sender
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id && tab.id !== sender.tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: "cursor_move",
                username: message.username,
                position: message.position,
                url: message.url,
                pageTitle: message.pageTitle
              }).catch(err => {
                // Ignore errors from tabs that don't have listeners
              })
            }
          })
        })
      }
    }
    sendResponse({ success: true })
    return true
  }
  
  // Forward console log to extension console
  if (message.action === "log_to_extension") {
    console.log(`[${message.source || "Content Script"}]`, message.message);
    sendResponse({ success: true });
    return true;
  }
})

// Handle extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log("Extension being unloaded, cleaning up...")
}); 