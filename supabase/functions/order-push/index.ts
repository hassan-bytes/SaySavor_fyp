declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";
// @ts-ignore
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('PUSH_VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('PUSH_VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('PUSH_VAPID_SUBJECT') || 'mailto:alerts@saysavor.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
};

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing Supabase service role configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing VAPID keys' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (!body?.order_id || !body?.restaurant_id) {
    return new Response(JSON.stringify({ error: 'Missing order_id or restaurant_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const eventType = body.event || 'order_created';
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: order, error: orderError } = await (supabase as any)
    .from('orders')
    .select('id, restaurant_id, customer_name, table_number, order_type, status')
    .eq('id', body.order_id)
    .maybeSingle();

  if (orderError) {
    console.error('[order-push] Order fetch error:', orderError);
  }

  const restaurantId = body.restaurant_id || order?.restaurant_id;
  if (!restaurantId) {
    return new Response(JSON.stringify({ error: 'Restaurant not found for order' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: subscriptions, error: subError } = await (supabase as any)
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId);

  if (subError) {
    return new Response(JSON.stringify({ error: subError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const orderLabelParts: string[] = [];
  if (order?.table_number) {
    orderLabelParts.push(`Table ${order.table_number}`);
  }
  if (order?.customer_name) {
    orderLabelParts.push(order.customer_name);
  }
  const orderLabel = orderLabelParts.length ? orderLabelParts.join(' - ') : 'Order';

  const title = eventType === 'order_item_added' ? 'Items Added to Order' : 'New Order Received';
  const bodyText = eventType === 'order_item_added'
    ? `${body.item_name ? `${body.item_name} added to ` : 'Items added to '}${orderLabel}.`
    : `New order received from ${orderLabel}.`;

  const notificationPayload = JSON.stringify({
    title,
    body: bodyText,
    url: '/dashboard/orders',
    tag: `order-${body.order_id}`,
    order_id: body.order_id,
    event: eventType,
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of subscriptions || []) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription, notificationPayload);
      sent += 1;
    } catch (err: any) {
      failed += 1;

      const statusCode = err?.statusCode || err?.status;
      if (statusCode === 404 || statusCode === 410) {
        removed += 1;
        await (supabase as any).from('push_subscriptions').delete().eq('id', sub.id);
      }

      console.error('[order-push] Push send error:', err?.message || err);
    }
  }

  return new Response(JSON.stringify({ sent, failed, removed }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
