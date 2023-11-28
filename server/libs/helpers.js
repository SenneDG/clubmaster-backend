// environment = require('../environment');

// Get URL based on environment
const getURL = () => {
    let url =
      //process.env.VERCEL_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
      'http://localhost:4200/';

    // Create the URL
    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };

// Define toDateTime function
const toDateTime = secs => {
    return new Date(secs * 1000);
  };
  
module.exports = {
    toDateTime,
    getURL
};
