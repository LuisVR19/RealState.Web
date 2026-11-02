"use client";

// Registra la vista de una propiedad (una vez por pestaña, ver lib/track.ts).
import { useEffect } from "react";
import { track } from "@/lib/track";

export function TrackView({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    track("property_view", propertyId);
  }, [propertyId]);
  return null;
}
