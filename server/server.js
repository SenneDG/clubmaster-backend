const createCheckoutSessionRoute = require('./routes/createCheckoutSession');
const webhookRoute = require('./routes/webhook');
const onboardUserRoute = require('./routes/createConnectAccount'); 
const checkoutRoute = require('./routes/createCheckoutSessionConnect');
const createPortalLinkRoute = require('./routes/createPortalLink');
const webhookConnectRoute = require('./routes/webhookConnect');

// Import express and create app
const express = require('express');
const app = express();

// Bypass CORS options  
const cors = require('cors');
app.use(cors()); 

// API routes
app.use('/create-checkout-session', createCheckoutSessionRoute);
app.use('/webhook', webhookRoute);
app.use('/webhook/connect', webhookConnectRoute)
app.use('/onboard-user', onboardUserRoute); 
app.use('/create-checkout-session-connect', checkoutRoute);
app.use('/create-portal-link', createPortalLinkRoute);

// Start server
app.listen(3000, '0.0.0.0', function() {
  console.log('Listening on port 3000');
});