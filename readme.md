# ClubMaster Stripe Integration

This repository contains the necessary configuration for integrating [Stripe](https://stripe.com/) and Stripe Connect into the [ClubMaster](https://github.com/t1sk3/DSAAS) Software as a Service (SaaS) platform. It enables subscription management for our SaaS offering and facilitates payments to connected Stripe accounts. The neccesary payment information was stored in a [Supabase](https://supabase.com/) database.

This project was created as part of the DSAAS course during the first semester of the master's year at Group T of KU Leuven.

## Deployment

The backend of this service is deployed on [Fly.io](https://fly.io/), a platform for deploying containerized applications. The provided Dockerfile outlines the necessary steps to containerize the backend for deployment.