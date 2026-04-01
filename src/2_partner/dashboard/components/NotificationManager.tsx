// ============================================================
// FILE: NotificationManager.tsx
// PURPOSE: Smart notification batching and DND mode
//          - Groups orders arriving within 2.5 seconds
//          - Plays single sound for batch instead of multiple
//          - Implements cooldown (max 1 sound per 10 seconds)
//          - Provides DND (Do Not Disturb) mode
// ============================================================

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { soundManager } from '@/shared/services/soundManager';

export interface Order {
  id: string;
  customer_name: string | null;
  status: string;
  created_at: string;
}

interface NotificationManagerProps {
  onOrdersReady?: (orders: Order[]) => void;
}

export const useNotificationManager = (props?: NotificationManagerProps) => {
  const notificationQueue = useRef<Order[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSoundTime = useRef<number>(0);
  const [dndMode, setDndMode] = useState<'off' | '5min' | '10min' | '15min'>('off');
  const [dndTimeRemaining, setDndTimeRemaining] = useState<number>(0);
  const [queueLength, setQueueLength] = useState<number>(0);
  const dndTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dndTimer.current) clearTimeout(dndTimer.current);
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  // Update DND countdown
  useEffect(() => {
    if (dndMode === 'off') {
      setDndTimeRemaining(0);
      return;
    }

    const durationMap = {
      '5min': 5 * 60,
      '10min': 10 * 60,
      '15min': 15 * 60,
    };

    const duration = durationMap[dndMode as keyof typeof durationMap] || 0;
    setDndTimeRemaining(duration);

    const interval = setInterval(() => {
      setDndTimeRemaining((prev) => {
        if (prev <= 1) {
          setDndMode('off');
          clearInterval(interval);
          toast.success('Do Not Disturb mode disabled');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dndMode]);

  const playBatchedSound = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSound = now - lastSoundTime.current;

    // Enforce 3-second cooldown between sounds (reduced from 10s for faster notifications)
    if (timeSinceLastSound < 3000) {
      console.log('⏳ Sound cooldown active - skipping sound');
      return false;
    }

    const didPlay = soundManager.playNewOrder();
    if (!didPlay) {
      console.log('🔇 Sound skipped - audio locked or disabled');
      return false;
    }
    lastSoundTime.current = now;
    return true;
  }, []);

  const processBatch = useCallback(() => {
    if (notificationQueue.current.length === 0) return;

    const orders = [...notificationQueue.current];
    notificationQueue.current = [];

    // Check if DND mode is active
    if (dndMode !== 'off') {
      // Show visual-only notification
      toast.info(
        `🔇 ${orders.length} new order${orders.length > 1 ? 's' : ''} received (DND mode active)`,
        {
          duration: 4000,
          description: `${orders.map((o) => o.customer_name || 'Guest').join(', ')}`,
        }
      );
      props?.onOrdersReady?.(orders);
      return;
    }

    // Play sound if cooldown allows
    const soundPlayed = playBatchedSound();

    // VISUAL NOTIFICATION - Always show (primary notification)
    if (orders.length === 1) {
      toast.success(`🔔 NEW ORDER from ${orders[0].customer_name || 'Guest'}!`, {
        duration: 5000,
        description: `Order #${orders[0].id.slice(-6).toUpperCase()} - Check dashboard now!`,
      });
    } else {
      toast.success(`🔔 ${orders.length} NEW ORDERS RECEIVED!`, {
        duration: 5000,
        description: `From: ${orders.map((o) => o.customer_name || 'Guest').join(', ')}`,
      });
    }

    // Browser Notification API (if granted permission) - Works even in background tabs
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = orders.length === 1 
        ? `New Order: ${orders[0].customer_name || 'Guest'}`
        : `${orders.length} New Orders`;
      const body = orders.length === 1
        ? `Order #${orders[0].id.slice(-6).toUpperCase()} received`
        : `Multiple orders waiting in dashboard`;
      
      new Notification(title, {
        body,
        icon: '🍕',
        tag: 'order-notification',
        requireInteraction: true,
        silent: false, // Play system sound even in background
        vibrate: [200, 100, 200], // Vibrate pattern for mobile devices
      });
      console.log('🌐 Browser Notification sent (works in background)');
    }

    // Log audio status
    if (soundPlayed) {
      console.log('🔊 Sound played successfully');
    } else if (orders.length > 0) {
      console.log('⏳ Sound skipped due to cooldown or locked audio - but VISUAL NOTIFICATION shown ✅');
    }

    props?.onOrdersReady?.(orders);
  }, [dndMode, playBatchedSound, props]);

  const addOrderToQueue = useCallback(
    (order: Order) => {
      // Check if order already in queue (prevent duplicates)
      if (notificationQueue.current.some((o) => o.id === order.id)) {
        return;
      }

      notificationQueue.current.push(order);
      setQueueLength(notificationQueue.current.length);
      console.log(`📦 Order queued: ${order.customer_name} (Queue size: ${notificationQueue.current.length})`);

      // Clear existing timer
      if (batchTimer.current) clearTimeout(batchTimer.current);

      // Set new timer (2.5 seconds) - wait for more orders to arrive, but notify quickly
      batchTimer.current = setTimeout(() => {
        console.log(`⏰ Batch timeout reached - processing ${notificationQueue.current.length} orders`);
        console.log(`📍 Tab visibility: ${document.hidden ? 'BACKGROUND' : 'ACTIVE'}`);
        processBatch();
        setQueueLength(notificationQueue.current.length);
      }, 2500);
    },
    [processBatch]
  );

  const enableDND = useCallback((duration: '5min' | '10min' | '15min') => {
    setDndMode(duration);
    const durationText = duration.replace('min', ' minutes');
    toast.info(`🔇 Do Not Disturb enabled for ${durationText}`, {
      duration: 3000,
      description: 'Visual notifications will still appear',
    });
  }, []);

  const disableDND = useCallback(() => {
    setDndMode('off');
    setDndTimeRemaining(0);
    toast.success('🔔 Do Not Disturb disabled', { duration: 2000 });
  }, []);

  const formatDNDTime = useCallback(() => {
    if (dndTimeRemaining === 0) return '';
    const mins = Math.floor(dndTimeRemaining / 60);
    const secs = dndTimeRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [dndTimeRemaining]);

  return {
    addOrderToQueue,
    enableDND,
    disableDND,
    dndMode,
    dndTimeRemaining,
    formatDNDTime,
    queueSize: notificationQueue.current.length,
  };
};
