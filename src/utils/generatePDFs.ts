/* eslint-disable @typescript-eslint/no-unused-vars */
import { tmpdir } from 'os';
import { join } from 'path';
import { Statement, StatementData } from '../model';
import { readFileSync } from 'fs';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { bucket, db } from './statements';

export const generatePDFs = (
  dataArray: StatementData[],
  templateName: string,
  userType: 'admin' | 'retailer' | 'customer',
  fileType: 'invoices' | 'statements' | 'detailed-invoices',
) => {
  const promises: any[] = [];
  const localTemplatePath = join(
    tmpdir(),
    `${fileType}-localTemplate.${userType}.html`,
  );
  return bucket
    .file(`templates/${templateName}`)
    .download({ destination: localTemplatePath })
    .then(() => {
      const source = readFileSync(localTemplatePath, 'utf8');
      const statements: any[] = [];

      dataArray.forEach((data) => {
        if (data.data.grandTotal !== 0) {
          promises.push(
            new Promise(async (resolve2, reject2) => {
              const html = handlebars.compile(source)(data);
              // Create a new PDF document in memory

              //Use storage bucket to save PDF
              let statementPath = `${fileType}/${data.name} - ${data.month}.pdf`;
              if (data.location) {
                statementPath = `${fileType}/${data.name}: ${data.location.name} - ${data.month}`;
              }
              if (fileType === 'detailed-invoices') {
                statementPath = `invoices/detailed/${data.name} - ${data.month}`;
              }

              // Launch Puppeteer and generate PDF
              const browser = await puppeteer.launch();
              const page = await browser.newPage();
              await page.setContent(html);

              // Generate PDF buffer
              const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                  top: '10mm',
                  right: '10mm',
                  bottom: '10mm',
                  left: '10mm',
                },
              });
              await browser.close();

              // Save the PDF to the Google Cloud Storage bucket
              const statementPdfRef = bucket.file(statementPath);
              const savePromise = statementPdfRef
                .save(pdfBuffer)
                .catch((e) => console.log(`Error saving PDF to bucket: ${e}`));

              savePromise.then(() => {
                // Set metadata for the file in the bucket
                bucket
                  .file(statementPath)
                  .setMetadata({
                    contentType: 'application/pdf',
                    metadata: {
                      customer: data.name,
                      retailer: data.name,
                      date: data.month,
                    },
                  })
                  .then(() => {
                    const statement: Statement = {
                      date: data.month,
                      path: statementPath,
                    };
                    statements.push(statement);

                    // Handle saving to Firestore based on user type
                    if (userType === 'admin') {
                      if (data.retailerRef) {
                        statement.retailerRef = data.retailerRef;
                      }
                      if (fileType === 'detailed-invoices') {
                        resolve2(
                          db
                            .firestore()
                            .doc(`temp/${data.retailerRef.id}`)
                            .set({
                              detailedInvoices: statements,
                            })
                            .catch((e) => console.log(e)),
                        );
                      } else {
                        resolve2(
                          db
                            .firestore()
                            .doc('admins/vaultwrx')
                            .update({
                              [fileType]:
                                db.firestore.FieldValue.arrayUnion(statement),
                            })
                            .then(() => console.log('success'))
                            .catch((e) => console.log(`error ${e}`)),
                        );
                      }
                    } else if (userType === 'retailer') {
                      resolve2(
                        data.retailerRef
                          .update({
                            [fileType]:
                              db.firestore.FieldValue.arrayUnion(statement),
                          })
                          .then(() => console.log('success'))
                          .catch((err) => console.log(`error ${err}`)),
                      );
                    } else if (userType === 'customer') {
                      resolve2(
                        data.customerRef
                          .update({
                            statements:
                              db.firestore.FieldValue.arrayUnion(statement),
                          })
                          .then(() => console.log('success'))
                          .catch((err) => console.log(`error ${err}`)),
                      );
                    }

                    console.log('PDF saved and metadata set in bucket');
                  })
                  .catch((err) => {
                    console.log(`Error setting metadata in bucket: ${err}`);
                    reject2(err);
                  });
              });
            }).catch((err) => console.log(err)),
          );
        }
      });
      return Promise.all(promises).catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};
