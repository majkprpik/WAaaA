import React, { useState } from "react";
import CustomOverlayEnhancer from "./CustomOverlayEnhancer";

/**
 * Example of an AI-generated custom overlay that uses the enhancer
 * to get the same hover button functionality as the DynamicOverlay component
 */
const CustomOverlayExample = ({ id, style, url, onDelete, onPin }) => {
  // You can maintain your own state for the custom overlay content
  const [count, setCount] = useState(0);
  
  return (
    <CustomOverlayEnhancer
      id={id}
      style={style}
      url={url}
      onDelete={onDelete}
      onPin={onPin}
      // You can pass content for copying (optional)
      content={`This is a custom overlay with counter: ${count}`}
    >
      {/* This is your custom overlay content */}
      <div style={{ padding: "10px", textAlign: "center" }}>
        <h3>Custom AI-Generated Overlay</h3>
        <p>This overlay now has the same hover buttons as DynamicOverlay!</p>
        <div style={{ margin: "15px 0" }}>
          <p>Counter: {count}</p>
          <button
            onClick={() => setCount(count + 1)}
            style={{
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              cursor: "pointer"
            }}
          >
            Increment
          </button>
        </div>
      </div>
    </CustomOverlayEnhancer>
  );
};

export default CustomOverlayExample; 