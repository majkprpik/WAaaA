// Content script to handle logging from popup via background script

// Listen for console_log messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "console_log") {
    // Log to the page console with a prefix
    console.log(`[${message.source.toUpperCase()}]`, message.message);
    
    // Send a response if needed
    sendResponse({ success: true });
  }
});

console.log("[DEBUG LOGGER] Initialized and ready to receive messages"); 