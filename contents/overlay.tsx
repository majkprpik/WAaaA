import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { createClient } from "@supabase/supabase-js"
import { OverlayTopLeft, OverlayTopRight, OverlayBottomLeft, OverlayBottomRight } from "../Overlays"

const SUPABASE_URL = "'http://127.0.0.1:54321"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const container = document.createElement("div")
container.id = "plasmo-overlays-container"
document.body.appendChild(container)

function OverlayRoot() {
  const [dynamicOverlays, setDynamicOverlays] = useState([])

  useEffect(() => {
    async function fetchOverlays() {
      const { data, error } = await supabase.from("overlays").select()
      if (error) return
      // Assume data is an array of { name: string, path: string }
      const loaded = await Promise.all(
        data.map(async (overlay) => {
          try {
            const mod = await import(/* @vite-ignore */ overlay.path)
            return mod.default ? React.createElement(mod.default) : null
          } catch {
            return null
          }
        })
      )
      setDynamicOverlays(loaded.filter(Boolean))
    }
    fetchOverlays()
  }, [])

  return (
    <>
      <OverlayTopLeft />
      <OverlayTopRight />
      <OverlayBottomLeft />
      <OverlayBottomRight />
      {dynamicOverlays.map((Comp, i) => (
        <React.Fragment key={i}>{Comp}</React.Fragment>
      ))}
    </>
  )
}

const root = ReactDOM.createRoot(container)
root.render(<OverlayRoot />)
