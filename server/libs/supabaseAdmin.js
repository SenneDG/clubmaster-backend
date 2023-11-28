// const environment = require('../environment');
const { toDateTime } = require('./helpers');

// Create Stripe client
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create supabase client
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

/* 
    * Upsert a product record to the database.
    * @param {object} product - The product object.
    * @returns {Promise} - Promise object representing the product record.
*/
const upsertProductRecord = async (product) => {
    const productData = {
      id: product.id,
      active: product.active,
      name: product.name,
      description: product.description || undefined,
      image: product.images && product.images[0] || null,
      metadata: product.metadata || {}
    };
  
    const { error } = await supabaseAdmin.from('products').upsert([productData]);
    if (error) throw error;
    console.log(`Product inserted/updated: ${product.id}`);
  };
  
  /*
    * Upsert a price record to the database.
    * @param {object} price - The price object.
    * @returns {Promise} - Promise object representing the price record.
  */
  const upsertPriceRecord = async (price) => {
    const priceData = {
      id: price.id,
      product_id: typeof price.product === 'string' ? price.product : '',
      active: price.active,
      currency: price.currency,
      description: price.nickname || undefined,
      type: price.type,
      unit_amount: price.unit_amount || undefined,
      interval: price.recurring ? price.recurring.interval : undefined,
      interval_count: price.recurring ? price.recurring.interval_count : undefined,
      trial_period_days: price.recurring ? price.recurring.trial_period_days : undefined,
      metadata: price.metadata || {}
    };
  
    const { error } = await supabaseAdmin.from('prices').upsert([priceData]);
    if (error) throw error;
    console.log(`Price inserted/updated: ${price.id}`);
  };
  
  const upsertPaymentRecord = async (uuid, clubid, paymentIntent) => {
    let date = toDateTime(paymentIntent.created);
    date.setFullYear(date.getFullYear() + 1); // This adds one year to the date
    let valid_until = date.toISOString();
    const paymentData = {
      user: uuid,
      club: clubid,
      created_at: toDateTime(paymentIntent.created).toISOString(),
      valid_until: valid_until,
    };
  
    const { error: upsertError } = await supabaseAdmin
      .from('club_users')
      .upsert([paymentData]);
    if (upsertError) throw upsertError;
    console.log(`Payment inserted/updated: ${paymentIntent.id}`);
  };

  /*
    * Upsert a subscription record to the database.
    * @param {string} subscriptionId - The subscription ID.
    * @param {string} customerId - The customer ID.
    * @param {boolean} createAction - Whether the subscription was created.
    * @returns {Promise} - Promise object representing the subscription record.
  */
  const manageSubscriptionStatusChange = async (
    subscriptionId,
    customerId,
    createAction = false
  ) => {
    // Get customer's UUID from mapping table.
    const { data: customerData, error: noCustomerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    if (noCustomerError || !customerData) {
      console.error(`No customer found for ID: ${customerId}`);
      throw noCustomerError;
    }
  
    const uuid = customerData.id;
  
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method']
    });
    // Upsert the latest status of the subscription object.
    const subscriptionData = {
      id: subscription.id,
      user_id: uuid,
      metadata: subscription.metadata || {},
      status: subscription.status,
      price_id: subscription.items.data[0].price.id,
      quantity: subscription.quantity,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? toDateTime(subscription.cancel_at).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? toDateTime(subscription.canceled_at).toISOString()
        : null,
      current_period_start: toDateTime(
        subscription.current_period_start
      ).toISOString(),
      current_period_end: toDateTime(
        subscription.current_period_end
      ).toISOString(),
      created: toDateTime(subscription.created).toISOString(),
      ended_at: subscription.ended_at
        ? toDateTime(subscription.ended_at).toISOString()
        : null,
      trial_start: subscription.trial_start
        ? toDateTime(subscription.trial_start).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? toDateTime(subscription.trial_end).toISOString()
        : null
    };
  
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert([subscriptionData]);
    if (error) throw error;
    console.log(
      `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
    );
  
    // For a new subscription, copy the billing details to the customer object.
    // NOTE: This is a costly operation and should happen at the very end.
    if (createAction && subscription.default_payment_method && uuid)
      await copyBillingDetailsToCustomer(
        uuid,
        subscription.default_payment_method
      );
  };

  /*
    * Copy the billing details from the payment method to the customer object.
    * @param {string} uuid - The UUID of the customer.
    * @param {object} paymentMethod - The payment method object.
    * @returns {Promise} - Promise object representing the customer record.
  */
  const copyBillingDetailsToCustomer = async (uuid, paymentMethod) => {
    const customer = paymentMethod.customer;
    const { name, phone, address } = paymentMethod.billing_details;
    if (!name || !phone || !address) return;
    await stripe.customers.update(customer, { name, phone, address });
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        billing_address: { ...address },
        payment_method: { ...paymentMethod[paymentMethod.type] }
      })
      .eq('id', uuid);
    if (error) throw error;
  };

  const createOrRetrieveCustomer = async ({ email, uuid }) => {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', uuid)
      .single();
  
    if (error || !data || !data.stripe_customer_id) {
      const customerData = {
        metadata: {
          supabaseUUID: uuid
        }
      };
  
      if (email) customerData.email = email;
  
      const customer = await stripe.customers.create(customerData);
  
      const { error: supabaseError } = await supabaseAdmin
        .from('customers')
        .insert([{ id: uuid, stripe_customer_id: customer.id }]);
  
      if (supabaseError) throw supabaseError;
  
      console.log(`New customer created and inserted for ${uuid}.`);
  
      return customer.id;
    }
  
    return data.stripe_customer_id;
  };

  const upsertAccountId = async (userId, accountId) => {
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({ stripe_account_id: accountId })
      .eq('owner', userId);
    if (error) throw error;
    console.log(`Account Id Inserted/Updated: ${accountId}`);
  };

  const getStripeAccountId = async (clubId) => {
    const { data, error } = await supabaseAdmin
      .from('clubs')
      .select('stripe_account_id')
      .eq('id', clubId)
    if (error) throw error;
    return data[0].stripe_account_id;
  }

  const getUnitAmount = async (clubId) => {
    const { data, error } = await supabaseAdmin
      .from('clubs')
      .select('payment_amount')
      .eq('id', clubId)
    if (error) throw error;
    return data[0].payment_amount;
  }

  module.exports = {
    upsertProductRecord,
    upsertPriceRecord,
    upsertPaymentRecord,
    manageSubscriptionStatusChange,
    createOrRetrieveCustomer,
    upsertAccountId,
    getStripeAccountId,
    getUnitAmount
  };