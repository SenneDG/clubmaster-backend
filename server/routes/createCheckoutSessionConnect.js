const express = require('express');
// const environment = require('../environment');
const router = express.Router();
const { getStripeAccountId, getUnitAmount } = require('../libs/supabaseAdmin');
const { getURL } = require('../libs/helpers'); 

// Create Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Body parser
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/', async (req, res) => {
    try {
      const { userId, clubId } = req.body;

      // get the stripe connect account id from the clubName
      const stripeAccountId = await getStripeAccountId(clubId);
      const unit_amount = await getUnitAmount(clubId)

      if(!stripeAccountId || stripeAccountId === null) {
        return res.status(400).json({ error: 'No Stripe account found for this club' });
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        line_items: [
          {
            // TODO: Replace with the ID of the price, and product the clubowner created (hardcoded for now)
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Yearly subscription',
              },
              unit_amount: unit_amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // TODO: change to the actual url of the member dashboard
        success_url: `${getURL()}member-dashboard`,
        cancel_url: `${getURL()}member-dashboard`,
        metadata: { 
          user_id: userId.toString(),
          club_id: clubId.toString(),
        },
      }, {
        stripeAccount: stripeAccountId,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while creating the checkout session' });
    }
  });

module.exports = router;