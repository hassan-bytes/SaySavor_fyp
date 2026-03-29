import { supabase } from '@/shared/lib/supabaseClient';

type PushSetupStatus = 'subscribed' | 'denied' | 'unsupported' | 'missing-key' | 'error';

export interface PushSetupResult {
  status: PushSetupStatus;
  error?: string;
}

const vapidPublicKey = import.meta.env.VITE_PUSH_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const registerOrderPushNotifications = async (restaurantId: string): Promise<PushSetupResult> => {
  if (!vapidPublicKey) {
    return { status: 'missing-key', error: 'Missing VITE_PUSH_PUBLIC_KEY' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { status: 'unsupported', error: 'Push not supported in this browser' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied', error: 'Notification permission denied' };
  }

  let subscription: PushSubscription;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const existingSubscription = await registration.pushManager.getSubscription();

    subscription = existingSubscription
      ? existingSubscription
      : await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
  } catch (error: any) {
    return { status: 'error', error: error?.message || 'Service worker registration failed' };
  }

  const subscriptionJson = subscription.toJSON();
  if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
    return { status: 'error', error: 'Invalid push subscription keys' };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { status: 'error', error: 'No authenticated user for push subscription' };
  }

  const { error } = await (supabase as any)
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        restaurant_id: restaurantId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    return { status: 'error', error: error.message };
  }

  return { status: 'subscribed' };
};
