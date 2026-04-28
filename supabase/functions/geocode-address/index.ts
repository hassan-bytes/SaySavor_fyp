// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const address = typeof body?.address === 'string' ? body.address.trim() : '';

  if (!address) {
    return new Response(JSON.stringify({ error: 'Missing address' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
    searchUrl.searchParams.set('q', address);
    searchUrl.searchParams.set('format', 'jsonv2');
    searchUrl.searchParams.set('limit', '1');

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SaySavor/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[geocode-address] Nominatim request failed:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Geocoding service unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;

    if (!first || first.lat === undefined || first.lon === undefined) {
      return new Response(JSON.stringify({ error: 'Address not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return new Response(JSON.stringify({ error: 'Invalid geocoding coordinates' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      latitude,
      longitude,
      display_name: String(first.display_name || address),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[geocode-address] Unexpected error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Failed to geocode address' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
