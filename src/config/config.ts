import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the types for the configuration
interface FirebaseConfig {
  vaultWrx: {
    domain: string;
    appUrl: string;
  };
  twillio: {
    number: string;
    accountSid: string;
    authToken: string;
  };
  ringCentral: {
    serverUrl: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
  };
  stripeApiKey: string;
  sendgridApiKey: string;
}

// Load the configuration from environment variables
const config: FirebaseConfig = {
  vaultWrx: {
    domain: 'vaults-online',
    appUrl: 'https://app.vaultwrx.com',
  },
  twillio: {
    number: process.env.TWILLIO_NUMBER!,
    accountSid: process.env.TWILLIO_ACCOUNTSID!,
    authToken: process.env.TWILLIO_AUTHTOKEN!,
  },
  ringCentral: {
    serverUrl: process.env.RINGCENTRAL_SERVERURL!,
    clientId: process.env.RINGCENTRAL_CLIENTID!,
    clientSecret: process.env.RINGCENTRAL_CLIENTSECRET!,
    username: process.env.RINGCENTRAL_USERNAME!,
    password: process.env.RINGCENTRAL_PASSWORD!,
  },
  stripeApiKey: process.env.STRIPE_APIKEY!,
  sendgridApiKey: process.env.SENDGRID_APIKEY!,
};

export default config;