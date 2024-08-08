import { config as cloudConfig } from "firebase-functions";
import { FirebaseConfig } from "../model/index";

const config: FirebaseConfig = {
  vaultWrx: {
    domain: cloudConfig().vaultwrx.domain,
    appUrl: cloudConfig().vaultwrx.appurl
  },
  twillio: {
    number: cloudConfig().twillio.number,
    accountSid: cloudConfig().twillio.accountsid,
    authToken: cloudConfig().twillio.authtoken
  },
  ringCentral: {
    serverUrl: cloudConfig().ringcentral.serverurl,
    clientId: cloudConfig().ringcentral.clientid,
    clientSecret: cloudConfig().ringcentral.clientsecret,
    username: cloudConfig().ringcentral.username,
    password: cloudConfig().ringcentral.password
  },
  stripeApiKey: cloudConfig().stripe.apikey,
  sendgridApiKey: cloudConfig().sendgrid.key
}

export default config;
