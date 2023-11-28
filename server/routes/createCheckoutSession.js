// const environment = require('../environment');
const { getURL } = require('../libs/helpers');
const { createOrRetrieveCustomer } = require('../libs/supabaseAdmin');

// Import express and create router
const express = require('express');
const router = express.Router();

// Body parser
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Create Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/', async (req, res) => {

   // Get Stripe price_ID and currently logged in user information from the request body
   const {priceId, userId, userEmail} = req.body;

  // Retrieve stripe_customer_id based on logged in user
  const customer = await createOrRetrieveCustomer({
    uuid: userId,
    email: userEmail
  });

  // Create a checkout session using the received data
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    customer: customer,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    allow_promotion_codes: true,
    subscription_data: {
      trial_from_plan: true,
      metadata: {}
    },
    success_url: `${getURL()}connect`,
    cancel_url: `${getURL()}`
  });

  // Return the session ID as response
  res.json({ sessionId: session.id });
});

module.exports = router;