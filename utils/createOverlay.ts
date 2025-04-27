import { createClient } from "@supabase/supabase-js"

// const SUPABASE_URL = "http://127.0.0.1:54321"
// const SUPABASE_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"


const SUPABASE_URL = "https://rwaycudvdrfzgdlysala.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXljdWR2ZHJmemdkbHlzYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTM4MjQsImV4cCI6MjA2MTIyOTgyNH0.jTRS83424TsPG6uVVyUbP9yu1H67NVBp9aUT9CZGDWA"
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper function to get username from background script
export const getUsernameFromBackground = (): Promise<string> => {
  return new Promise<string>((resolve) => {
    chrome.runtime.sendMessage({ action: "get_username" }, (response) => {
      if (response && response.username) {
        resolve(response.username);
      } else {
        resolve("anonymous");
      }
    });
  });
};

// Define common interface for all overlay types
export interface BaseLayoutProps {
  style: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    width?: number | string;
    height?: number | string;
    border?: string;
    borderRadius?: string;
    backgroundColor?: string;
    [key: string]: any;
  };
  url?: string;
}

// Standard note overlay
export interface NoteLayout extends BaseLayoutProps {
  type: "note";
  content: string;
}

// Button overlay
export interface ButtonLayout extends BaseLayoutProps {
  type: "button";
  label: string;
  action?: string; // Action identifier or function name
  color?: string;
  icon?: string;
}

// Timer overlay
export interface TimerLayout extends BaseLayoutProps {
  type: "timer";
  duration: number; // in seconds
  autoStart?: boolean;
  format?: string;
  onComplete?: string; // Action to perform when timer completes
}

// Search overlay
export interface SearchLayout extends BaseLayoutProps {
  type: "search";
  placeholder?: string;
  target?: string; // Where to search
  suggestions?: string[];
}

// Form overlay
export interface FormLayout extends BaseLayoutProps {
  type: "form";
  title?: string;
  fields: Array<{
    id: string;
    type: "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "password";
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{value: string, label: string}>; // For select fields
    defaultValue?: string | number | boolean;
  }>;
  submitButtonText?: string;
  onSubmitAction?: string; // Action to perform on submission
  submitEndpoint?: string; // URL to send data to
  successMessage?: string;
}

// Grid overlay
export interface GridLayout extends BaseLayoutProps {
  type: "grid";
  title?: string;
  columns: Array<{
    id: string;
    header: string;
    accessor: string;
    type?: "text" | "number" | "date" | "boolean" | "image" | "actions";
    sortable?: boolean;
    filterable?: boolean;
    width?: number | string;
  }>;
  data: Array<Record<string, any>>; // Rows of data
  pagination?: {
    enabled: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  sorting?: {
    enabled: boolean;
    defaultSortColumn?: string;
    defaultSortDirection?: "asc" | "desc";
  };
  filtering?: {
    enabled: boolean;
    placeholder?: string;
  };
  rowActions?: Array<{
    label: string;
    icon?: string;
    action: string;
  }>;
}

// Chat AI overlay
export interface ChatAiLayout extends BaseLayoutProps {
  type: "chatai";
  title?: string;
  placeholder?: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp?: number;
  }>;
  apiKey?: string;
  model?: string;
}

// Approval/Signature overlay
export interface ApprovalLayout extends BaseLayoutProps {
  type: "approval";
  title?: string;
  content: string;
  approveButtonText?: string;
  rejectButtonText?: string;
  approvedBy?: string;
  approvedAt?: number;
  rejected?: boolean;
  rejectedBy?: string;
  rejectedAt?: number;
}

// Poll overlay
export interface PollLayout extends BaseLayoutProps {
  type: "poll";
  title: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  multipleChoice?: boolean;
  votedBy?: string[];
  totalVotes?: number;
  createdAt?: number;
  expiresAt?: number;
}

// Translation overlay
export interface TranslationLayout extends BaseLayoutProps {
  type: "translation";
  sourceText?: string;
  translatedText?: string;
  sourceLang?: string;
  targetLang?: string;
  history?: Array<{
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    timestamp: number;
  }>;
  apiKey?: string;
}

// Explain overlay
export interface ExplainLayout extends BaseLayoutProps {
  type: "explain";
  inputText?: string;
  explanation?: string;
  level?: "simple" | "detailed" | "technical";
  history?: Array<{
    inputText: string;
    explanation: string;
    level: string;
    timestamp: number;
  }>;
  apiKey?: string;
}

// Any other overlay type
export interface CustomLayout extends BaseLayoutProps {
  type: string;
  [key: string]: any;
}

// Union type for all overlay layouts
export type OverlayLayout = 
  | NoteLayout 
  | ButtonLayout 
  | TimerLayout 
  | SearchLayout 
  | ChatAiLayout
  | FormLayout
  | GridLayout
  | ApprovalLayout
  | PollLayout
  | TranslationLayout
  | ExplainLayout
  | CustomLayout;

export interface OverlayData {
  id: number;
  name: string;
  path?: string;
  layout?: OverlayLayout;
}

/**
 * Creates a new overlay in the database with the given layout and username
 * @param name The name of the overlay
 * @param layout The layout object containing style and content
 * @param username The username to associate with the overlay
 * @returns The created overlay data or null if an error occurred
 */
export async function createOverlayWithUsername(name: string, layout: OverlayLayout, username: string) {
  try {
    const overlayData = {
      name,
      layout,
      users: username
    };

    const { data, error } = await supabase
      .from("overlays")
      .insert(overlayData)
      .select()
      .single();

    if (error) {
      console.error("Error creating overlay with username:", error);
      return null;
    }

    return data;
  } catch (e) {
    console.error("Exception creating overlay with username:", e);
    return null;
  }
}

/**
 * Creates a new overlay with the current username from background script
 * @param name The name of the overlay
 * @param layout The layout object containing style and content
 * @returns The created overlay data or null if an error occurred
 */
export async function createOverlayWithCurrentUsername(name: string, layout: OverlayLayout) {
  try {
    // Get current username from background script
    const currentUsername = await getUsernameFromBackground();
    return createOverlayWithUsername(name, layout, currentUsername);
  } catch (e) {
    console.error("Exception creating overlay with current username:", e);
    return null;
  }
}

/**
 * Creates a new overlay in the database with the given layout
 * @param name The name of the overlay
 * @param layout The layout object containing style and content
 * @returns The created overlay data or null if an error occurred
 */
export async function createOverlay(name: string, layout: OverlayLayout) {
  try {
    const { data, error } = await supabase
      .from("overlays")
      .insert({ name, layout })
      .select()
      .single()

    if (error) {
      console.error("Error creating overlay:", error)
      return null
    }

    return data
  } catch (e) {
    console.error("Exception creating overlay:", e)
    return null
  }
}

/**
 * Fetches all overlays from the database
 * @returns Array of overlay data
 */
export async function fetchOverlays(): Promise<OverlayData[]> {
  try {
    const { data, error } = await supabase.from("overlays").select()
    
    if (error) {
      console.error("Error fetching overlays:", error)
      return []
    }
    
    return data || []
  } catch (e) {
    console.error("Exception fetching overlays:", e)
    return []
  }
}

/**
 * Subscribes to changes in the overlays table
 * @param callback Function to call when changes occur
 * @returns An object with an unsubscribe function
 */
export function subscribeToOverlays(callback: (payload: any) => void) {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn("Attempted to subscribe in a non-browser environment")
      return {
        unsubscribe: () => {}
      }
    }
    
    const subscription = supabase
      .channel('overlay-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'overlays'
        },
        (payload) => {
          try {
            callback(payload)
          } catch (e) {
            console.error("Error in subscription callback:", e)
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
      })
    
    return {
      unsubscribe: () => {
        try {
          subscription.unsubscribe()
        } catch (e) {
          console.error("Error unsubscribing:", e)
        }
      }
    }
  } catch (e) {
    console.error("Exception setting up subscription:", e)
    return {
      unsubscribe: () => {}
    }
  }
}

/**
 * Example usage:
 * 
 * const overlayData = {
 *   style: {
 *     top: 150,
 *     left: 300,
 *     width: 200,
 *     border: "1px solid black",
 *     height: 100,
 *     borderRadius: "8px",
 *     backgroundColor: "white"
 *   },
 *   content: "Hello world!"
 * }
 * 
 * createOverlay("test", overlayData)
 */ 