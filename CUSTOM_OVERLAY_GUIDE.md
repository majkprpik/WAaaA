# Adding Hover Controls to Custom Overlays

This guide explains how to add the same hover buttons and controls found in the DynamicOverlay component to your custom AI-generated overlays.

## Overview

The built-in `DynamicOverlay` component has specialized hover functionality, including:

- Hover-activated controls (buttons appear only when hovering)
- Specialized button positioning (top and side buttons)
- Dragging functionality
- Username display and management
- Copy/share capabilities

Your custom AI-generated overlays can have all these features with minimal code changes.

## Method 1: Using the CustomOverlayEnhancer Wrapper

The easiest way to add hover controls is to wrap your custom overlay with `CustomOverlayEnhancer`.

```jsx
import CustomOverlayEnhancer from "./components/CustomOverlayEnhancer";

// Your existing custom overlay
const MyCustomOverlay = ({ customProp1, customProp2 }) => {
  return (
    <div>
      <h3>{customProp1}</h3>
      <p>{customProp2}</p>
    </div>
  );
};

// Wrapped with enhancer to add hover controls
const MyEnhancedOverlay = ({ id, style, url, onDelete, onPin, customProp1, customProp2 }) => {
  return (
    <CustomOverlayEnhancer
      id={id}
      style={style}
      url={url}
      onDelete={onDelete}
      onPin={onPin}
      content={`${customProp1}: ${customProp2}`} // Content for the copy button
    >
      <MyCustomOverlay customProp1={customProp1} customProp2={customProp2} />
    </CustomOverlayEnhancer>
  );
};
```

## Method 2: Using the enhanceCustomOverlay Utility

For a more reusable approach, use the `enhanceCustomOverlay` utility function:

```jsx
import { enhanceCustomOverlay } from "./utils/enhanceCustomOverlays";

// Your existing custom overlay
const MyCustomOverlay = ({ customProp1, customProp2 }) => {
  return (
    <div>
      <h3>{customProp1}</h3>
      <p>{customProp2}</p>
    </div>
  );
};

// Create an enhanced version
const EnhancedCustomOverlay = enhanceCustomOverlay(MyCustomOverlay);

// Use it like this:
<EnhancedCustomOverlay 
  id={1}
  style={{ top: 100, left: 100 }}
  url="https://example.com"
  onDelete={() => console.log("delete")}
  onPin={(isPinned) => console.log("pin", isPinned)}
  content="This text will be copied when using copy button"
  customProp1="Hello"
  customProp2="World"
/>
```

## Required Props for the Enhancer

When using either method, you must provide these props:

- `id`: Unique identifier for the overlay (optional)
- `style`: CSS styles including positioning (required)
- `url`: URL for page-specific overlays (optional)
- `onDelete`: Function to call when delete button is clicked (optional)
- `onPin`: Function to call when pin status changes (optional)
- `content`: Text content for copy button (optional)

## Functionality Added to Your Overlay

Your enhanced overlay will now have:

1. **Dragging**: Click and drag to move the overlay
2. **Hover Controls**: Buttons appear when hovering
   - Top buttons: Username display, pin/unpin, delete
   - Side buttons: Copy, share
3. **Sharing**: Share with specific users
4. **Copying**: Copy content to clipboard
5. **Pinning**: Pin to show on all pages or just current page
6. **Z-index Management**: Automatically brings to front when interacted with

## Example

See the example in `components/AIGeneratedOverlayExample.tsx` for a complete implementation. 