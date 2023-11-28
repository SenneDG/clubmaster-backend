// Import express and create router
const express = require('express');
const router = express.Router();

const { upsertPaymentRecord, upsertAccountId } = require('../libs/supabaseAdmin'); 

// Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

const relevantEvents = new Set([
  'checkout.session.completed',
  'account.updated'
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
          case 'checkout.session.completed':
            const session = event.data.object;
            console.log(session);
            const userId = session.metadata.user_id;
            const clubId = session.metadata.club_id;
            await upsertPaymentRecord(userId, clubId, session);
            break;
          case 'account.updated':
            console.log(event);
            const account = event.data.object;
            const userId2 = account.metadata.userId;
            await upsertAccountId(userId2, account.id);
            break;
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