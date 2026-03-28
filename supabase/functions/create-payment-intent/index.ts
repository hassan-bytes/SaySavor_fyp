// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// @ts-ignore
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Log all headers for debugging
        console.log('[create-payment-intent] Request headers:', {
            authorization: req.headers.get('authorization') ? 'present' : 'missing',
            contentType: req.headers.get('content-type'),
        })
        console.log('[create-payment-intent] Received request, STRIPE_SECRET_KEY exists:', !!STRIPE_SECRET_KEY)
        
        const { amount, currency, restaurantId, metadata } = await req.json()
        console.log('[create-payment-intent] Parsed body:', { amount, currency, restaurantId })

        // Validate required fields
        if (!amount || !restaurantId) {
            throw new Error('Missing required fields: amount, restaurantId')
        }

        // Validate Stripe is configured
        if (!STRIPE_SECRET_KEY) {
            console.error('[create-payment-intent] ERROR: STRIPE_SECRET_KEY not set')
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
        }

        // Create PaymentIntent using direct Stripe API call (avoids Stripe library Deno issues)
        console.log('[create-payment-intent] Creating PaymentIntent...')
        
        const stripeParams = new URLSearchParams({
            amount: String(Math.round(amount * 100)), // amounts in cents
            currency: (currency?.toLowerCase() || 'usd'),
            'automatic_payment_methods[enabled]': 'true',
            'metadata[restaurant_id]': restaurantId,
        })

        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                stripeParams.append(`metadata[${key}]`, String(value))
            }
        }

        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: stripeParams.toString(),
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('[create-payment-intent] Stripe API error:', errorData)
            throw new Error(`Stripe API error: ${response.statusText}`)
        }

        const paymentIntentData = await response.json()
        console.log('[create-payment-intent] Success! Client secret:', paymentIntentData.client_secret?.substring(0, 20) + '...')
        
        return new Response(
            JSON.stringify({ clientSecret: paymentIntentData.client_secret }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error('[create-payment-intent] Error:', error.message || error)
        return new Response(
            JSON.stringify({ 
                error: error.message || 'Failed to create payment intent',
                details: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
