// const bucket = admin
//   .storage()
//   .bucket("gs://" + config.vaultWrx.domain + ".appspot.com/");

import { createInvoice } from "./retailerInvoice";

export async function generatePDFs(
  dataArray: any,
  templateName: string,
  userType: string,
  fileType: string
) {
  // const localTemplatePath = join(
  //   tmpdir(),
  //   `${fileType}-localTemplate.${userType}.html`
  // );

  try {
    console.log(dataArray);

    // return dataArray;
    //   await bucket.file(`templates/${templateName}`).download({ destination: localTemplatePath });
    //   const source = readFileSync(localTemplatePath, 'utf8');
    
    dataArray.forEach((data:any) => {
      if (data.data.grandTotal !== 0) {
        createInvoice(data);
      }
    });

    // await Promise.all(promises);
  } catch (err) {
    console.error(err);
  }
}
