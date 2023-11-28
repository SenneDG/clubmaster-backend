const express = require('express');
// const environment = require('../environment');
const router = express.Router();
const { getURL } = require('../libs/helpers');

// Create Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Body parser
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/', async (req, res) => {
  const userId = req.body.userId;

  try {
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        userId: userId.toString(),
      },
    });
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${getURL()}owner-dashboard`,
      return_url: `${getURL()}owner-dashboard`,
      type: 'account_onboarding',
    });
    res.send({ url: accountLink.url });
  } catch (err) {
    if (err.type === 'StripeInvalidRequestError') {
      res.status(400).send({ error: 'Invalid request to Stripe API' });
    } else if (err.type === 'StripeAPIError') {
      res.status(500).send({ error: 'Error with Stripe API' });
    } else if (err.type === 'StripeConnectionError') {
      res.status(500).send({ error: 'Network error' });
    } else {
      console.log("err", err);
      res.status(500).send({ error: 'An unknown error occurred' });
    }
  }
});

module.exports = router;