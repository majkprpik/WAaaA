// Background script for the extension
// This script runs in the background and handles username setup and management

import { Storage } from "@plasmohq/storage"

// Create a storage instance for the extension
const storage = new Storage()

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed or updated:", details.reason)

  if (details.reason === "install") {
    console.log("This is a first install, showing username setup")
    
    // Open the popup to prompt for username
    chrome.action.openPopup()
    
    // Set a flag to indicate setup is needed
    await storage.set("needs_username_setup", true)
  }
})

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
})

// Expose username to content scripts via a web-accessible resource
export {} 