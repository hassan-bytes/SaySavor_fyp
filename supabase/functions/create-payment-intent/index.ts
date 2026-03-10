// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { Stripe } from "https://esm.sh/stripe?target=deno"

// @ts-ignore
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')

const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2022-11-15',
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { amount, currency, restaurantId, metadata } = await req.json()

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amounts in cents
            currency: currency || 'pkr',
            metadata: {
                ...metadata,
                restaurant_id: restaurantId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        })

        return new Response(
            JSON.stringify({ clientSecret: paymentIntent.client_secret }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
