import { tmpdir } from "os";
import { join } from "path";
import config from "./config/config";
import { Statement } from "./model";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./dev_config/serviceAccountKeyDev.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// const bucket = admin
//   .storage()
//   .bucket("gs://" + config.vaultWrx.domain + ".appspot.com/");

export async function generatePDFs(
    dataArray,
    templateName,
    userType,
    fileType
  ) {
    const promises = [];
    const options = {
      // format: 'A4',
      printBackground: true,
      timeout: 6000000,
    };
    // const localTemplatePath = join(
    //   tmpdir(),
    //   `${fileType}-localTemplate.${userType}.html`
    // );
  
    try {
    //   await bucket.file(`templates/${templateName}`).download({ destination: localTemplatePath });
    //   const source = readFileSync(localTemplatePath, 'utf8');
      const statements = [];
  
      for (const data of dataArray) {
        if (data.data.grandTotal !== 0) {
        //   const html = handlebars.compile(source)(data);
  
          promises.push(
            (async () => {
              try {
               
                console.log(data);
              } catch (error) {
                console.error('PDF creation error:', error);
                throw error;
              }
            })()
          );
        }
      }
  
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    }
  }