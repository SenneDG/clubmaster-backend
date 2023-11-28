// const environment = require('../environment');
const { upsertProductRecord, upsertPriceRecord, manageSubscriptionStatusChange, upsertPaymentRecord } = require('../libs/supabaseAdmin'); 

// Import express and create router
const express = require('express');
const router = express.Router();

// Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

router.post('/', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  // Verify webhook signature and extract the event.
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          console.log(subscription);
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer,
            event.type === 'customer.subscription.created'
          );
          break;
        
        // case 'checkout.session.completed':
        //   const checkoutSession = event.data.object;
        //   if (checkoutSession.mode === 'subscription') {
        //     const subscriptionId = checkoutSession.subscription;
        //     await manageSubscriptionStatusChange(
        //       subscriptionId,
        //       checkoutSession.customer,
        //       true
        //     );
        //   }
        //   break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling event: ${event.type}`);
      console.error(error);
      response.status(500).send({ error: 'An error occurred while handling the event' });
      return;
    }
  }
  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

module.exports = router;