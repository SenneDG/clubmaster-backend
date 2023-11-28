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
      const {userId, userEmail} = req.body;

      // Retrieve stripe_customer_id based on logged in user
      const customer = await createOrRetrieveCustomer({
        uuid: userId,
        email: userEmail
      });

      if (!customer) throw Error('Could not get customer');
      const session = await stripe.billingPortal.sessions.create({
        customer: customer,
        return_url: `${getURL()}owner-dashboard`,
      });

      res.json({ url: session.url });
});

module.exports = router;