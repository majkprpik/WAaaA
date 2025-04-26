import React from "react";
import CustomOverlayEnhancer from "../components/CustomOverlayEnhancer";

// Define the props expected by the enhance function
interface EnhancerProps {
  id?: number;
  style: React.CSSProperties;
  url?: string;
  content?: string;
  onDelete?: () => void;
  onPin?: (isPinned: boolean) => void;
}

/**
 * Enhances a custom overlay component by wrapping it with CustomOverlayEnhancer
 * This adds all the hover controls and button functionality to any existing overlay
 * 
 * @param CustomComponent The original custom overlay component to enhance
 * @returns A new component with all the hover controls and functionality
 */
export function enhanceCustomOverlay<P>(CustomComponent: React.ComponentType<P>) {
  // Create the enhanced component
  const Enhanced = (props: EnhancerProps & P) => {
    // Extract the enhancer props
    const { id, style, url, onDelete, onPin, content, ...rest } = props;
    
    // Create the enhancer props object
    const enhancerProps = {
      id,
      style,
      url,
      onDelete,
      onPin,
      content,
      children: React.createElement(CustomComponent, rest as unknown as P)
    };
    
    // Return the enhanced component
    return React.createElement(CustomOverlayEnhancer, enhancerProps);
  };
  
  return Enhanced;
}

/**
 * Example usage:
 * 
 * // Original component
 * const MyCustomOverlay = ({ someProps }) => {
 *   return <div>Custom content: {someProps}</div>;
 * };
 * 
 * // Enhanced component with hover controls
 * const EnhancedCustomOverlay = enhanceCustomOverlay(MyCustomOverlay);
 * 
 * // Use it like this:
 * <EnhancedCustomOverlay
 *   id={1}
 *   style={{ top: 100, left: 100 }}
 *   url="https://example.com"
 *   onDelete={() => {}}
 *   onPin={() => {}}
 *   content="This will be used for copying"
 *   someProps="This will be passed to the original component"
 * />
 */ 