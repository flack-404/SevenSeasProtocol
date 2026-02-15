"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { usePlayer } from "../libs/providers/player-provider";

export const NotificationToaster = () => {
  const { notification } = usePlayer();
  
  useEffect(() => {
    if (notification) {
      // Parse the notification to determine the type
      if (notification.startsWith("✅")) {
        toast.success(notification);
      } else if (notification.startsWith("❌")) {
        toast.error(notification);
      } else if (notification.startsWith("⚠️")) {
        toast.warning(notification);
      } else if (notification.startsWith("ℹ️")) {
        toast.info(notification);
      } else {
        // Default to info for other notifications
        toast.info(notification);
      }
    }
  }, [notification]);
  
  return null; // This component doesn't render anything itself
}; 