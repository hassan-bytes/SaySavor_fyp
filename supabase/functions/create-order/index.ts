declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const INTERNAL_AI_SECRET = Deno.env.get('INTERNAL_AI_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ai-secret',
};

type IncomingItem = {
  name?: string;
  quantity?: number | string;
  price?: number | string;
  menu_item_id?: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase service role configuration' }, 500);
  }

  if (!INTERNAL_AI_SECRET) {
    return jsonResponse({ error: 'Missing INTERNAL_AI_SECRET configuration' }, 500);
  }

  const secret = req.headers.get('x-ai-secret');
  if (secret !== INTERNAL_AI_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const resId = typeof body?.res_id === 'string' ? body.res_id.trim() : '';
  const tableNo = typeof body?.table_no === 'string' ? body.table_no.trim() : null;
  const providedTotal = Number(body?.total_price);
  const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  if (!resId) {
    return jsonResponse({ error: 'Restaurant ID is required' }, 400);
  }

  if (!items.length) {
    return jsonResponse({ error: 'At least one item is required' }, 400);
  }

  const normalizedItems = items
    .map((it) => {
      const name = typeof it?.name === 'string' ? it.name.trim() : '';
      const quantity = Number(it?.quantity);
      const unitPrice = Number(it?.price);
      const menuItemId = typeof it?.menu_item_id === 'string' ? it.menu_item_id.trim() : null;

      if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return null;
      }

      return {
        item_name: name,
        quantity,
        unit_price: unitPrice,
        total_price: unitPrice * quantity,
        menu_item_id: menuItemId || null,
      };
    })
    .filter((it): it is NonNullable<typeof it> => it !== null);

  if (!normalizedItems.length) {
    return jsonResponse({ error: 'No valid items provided' }, 400);
  }

  const computedTotal = normalizedItems.reduce((sum, it) => sum + it.total_price, 0);
  const totalAmount = Number.isFinite(providedTotal) && providedTotal >= 0 ? providedTotal : computedTotal;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Create order record first.
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .insert([
        {
          restaurant_id: resId,
          table_number: tableNo,
          customer_name: 'Jarvis AI',
          customer_phone: 'N/A',
          customer_address: tableNo ? `Table ${tableNo}` : 'AI order',
          order_type: tableNo ? 'DINE_IN' : 'TAKEAWAY',
          payment_method: 'CASH',
          payment_status: 'pending',
          session_status: 'active',
          total_amount: totalAmount,
          status: 'pending',
          is_guest: true,
        },
      ])
      .select('id')
      .single();

    if (orderError || !order?.id) {
      throw orderError || new Error('Failed to create order');
    }

    // 2. Bulk insert items for created order.
    const orderItems = normalizedItems.map((it) => ({
      order_id: order.id,
      item_name: it.item_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
      menu_item_id: it.menu_item_id,
    }));

    const { error: itemsError } = await (supabase as any).from('order_items').insert(orderItems);

    if (itemsError) {
      // Best-effort cleanup so partial order does not remain without items.
      await (supabase as any).from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    return jsonResponse({ success: true, order_id: order.id }, 200);
  } catch (error: any) {
    return jsonResponse({ error: error?.message || 'Failed to create order' }, 400);
  }
});
