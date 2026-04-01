// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { Stripe } from "https://esm.sh/stripe?target=deno"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// @ts-ignore
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
// @ts-ignore
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Validate required environment variables
if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}
if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
}
if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2022-11-15',
})

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})

const updateOrderPaymentStatus = async ({
    paymentIntentId,
    restaurantId,
    orderId,
    paymentStatus,
}: {
    paymentIntentId: string
    restaurantId?: string
    orderId?: string
    paymentStatus: 'PAID' | 'FAILED'
}) => {
    const updatedAt = new Date().toISOString()

    if (orderId && restaurantId) {
        const { data: byMetadata, error: byMetadataError } = await supabase
            .from('orders')
            .update({
                payment_status: paymentStatus,
                stripe_payment_intent_id: paymentIntentId,
                updated_at: updatedAt,
            })
            .eq('id', orderId)
            .eq('restaurant_id', restaurantId)
            .select('id')
            .limit(1)

        if (byMetadataError) {
            console.error('[Stripe Webhook] Metadata-based update failed:', byMetadataError)
        } else if (byMetadata && byMetadata.length > 0) {
            return { updated: true, strategy: 'metadata' as const }
        }
    }

    const { data: byIntentId, error: byIntentIdError } = await supabase
        .from('orders')
        .update({
            payment_status: paymentStatus,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: updatedAt,
        })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .select('id')
        .limit(1)

    if (byIntentIdError) {
        console.error('[Stripe Webhook] PaymentIntent-based fallback update failed:', byIntentIdError)
        return { updated: false, strategy: 'payment_intent' as const, reason: byIntentIdError.message }
    }

    if (byIntentId && byIntentId.length > 0) {
        return { updated: true, strategy: 'payment_intent' as const }
    }

    return { updated: false, strategy: 'none' as const, reason: 'No matching order found' }
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get raw body for signature verification
        const body = await req.text()
        const signature = req.headers.get('stripe-signature')

        // Verify webhook signature
        let event
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature || '',
                STRIPE_WEBHOOK_SECRET || ''
            )
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message)
            return new Response(
                JSON.stringify({ error: 'Webhook signature verification failed' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        // Handle payment_intent.succeeded event
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as any
            const restaurantId = paymentIntent.metadata?.restaurant_id
            const orderId = paymentIntent.metadata?.order_id

            console.log(`Processing payment_intent.succeeded: PI=${paymentIntent.id}, Order=${orderId}`)

            const updateResult = await updateOrderPaymentStatus({
                paymentIntentId: paymentIntent.id,
                restaurantId,
                orderId,
                paymentStatus: 'PAID',
            })

            if (updateResult.updated) {
                console.log(`[Stripe Webhook] Payment marked PAID via ${updateResult.strategy} for PI=${paymentIntent.id}`)
            } else {
                console.warn(`[Stripe Webhook] Could not map successful payment yet for PI=${paymentIntent.id}. Requesting retry.`, {
                    orderId: orderId || 'MISSING',
                    restaurantId: restaurantId || 'MISSING',
                    reason: updateResult.reason,
                    metadata: paymentIntent.metadata,
                })

                return new Response(
                    JSON.stringify({ error: 'Order not found yet for payment intent. Retry webhook.' }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 409,
                    }
                )
            }
        }

        // Handle payment_intent.payment_failed event
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as any
            const restaurantId = paymentIntent.metadata?.restaurant_id
            const orderId = paymentIntent.metadata?.order_id

            console.log(`Processing payment_intent.payment_failed: PI=${paymentIntent.id}, Order=${orderId}`)

            const updateResult = await updateOrderPaymentStatus({
                paymentIntentId: paymentIntent.id,
                restaurantId,
                orderId,
                paymentStatus: 'FAILED',
            })

            if (updateResult.updated) {
                console.log(`[Stripe Webhook] Payment marked FAILED via ${updateResult.strategy} for PI=${paymentIntent.id}`)
            } else {
                console.warn(`[Stripe Webhook] Could not map failed payment yet for PI=${paymentIntent.id}. Requesting retry.`, {
                    orderId: orderId || 'MISSING',
                    restaurantId: restaurantId || 'MISSING',
                    reason: updateResult.reason,
                    metadata: paymentIntent.metadata,
                })

                return new Response(
                    JSON.stringify({ error: 'Order not found yet for failed payment intent. Retry webhook.' }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 409,
                    }
                )
            }
        }

        // Return 200 immediately (webhook delivery is async)
        return new Response(
            JSON.stringify({ received: true }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error('Webhook error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
