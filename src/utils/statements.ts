/* eslint-disable @typescript-eslint/no-unused-vars */
// import { formatDate, formatTime, total } from '.';
import {
  Customer,
  Order,
  OrderStatement,
  Retailer,
  StatementData,
} from '../model';
import * as admin from 'firebase-admin';
import moment from 'moment-timezone';
import handlebars from 'handlebars';
import { formatDate, total } from '.';
import config from '../config/config';
import { formatAdminOrdersForReport } from './formatAdminOrdersForReport';
import { formatCustomersForReport } from './formatCustomersForReport';
import { generatePDFs } from './generatePDFs';

// const serviceAccount = require('../dev_config/serviceAccountKeyDev.json');
// !! PRODUCTION
const serviceAccount = require('../prod_config/serviceAccountKeyProd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const bucket = admin
  .storage()
  .bucket('gs://' + config.vaultWrx.domain + '.appspot.com/');

export const db = admin;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

handlebars.registerHelper('link', (text, url) => {
  const urlString = handlebars.escapeExpression(url);
  const textString = handlebars.escapeExpression(text);
  return new handlebars.SafeString(
    `<a target="_blank" href="${urlString}">${textString}</a>`,
  );
});

handlebars.registerHelper('currency', (number) => {
  const numberString = handlebars.escapeExpression(number);
  return currencyFormatter.format(+numberString);
});

const Handlebars = require('handlebars');

// Register a custom math helper
Handlebars.registerHelper(
  'math',
  function (lvalue: any, operator: any, rvalue: any, options: any) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    switch (operator) {
      case '+':
        return lvalue + rvalue;
      case '-':
        return lvalue - rvalue;
      case '*':
        return lvalue * rvalue;
      case '/':
        return lvalue / rvalue;
      case '%':
        return lvalue % rvalue;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  },
);

export const sum = (result: number, item: number) => result + item;

function formatRetailersForReport(array: StatementData[]) {
  let customers: StatementData[] = [];
  let platformFee = 0;
  let grandTotal = 0;
  const salesTax = 0;
  if (array && array.length) {
    customers = array;
    platformFee = customers.map((r) => +r.data.platformFee).reduce(sum, 0);
    grandTotal = customers.map((r) => +r.data.grandTotal).reduce(sum, 0);
  }
  return { customers, platformFee, grandTotal, salesTax };
}

function formatOrdersForReport(array: Order[], discount: number) {
  let orders: OrderStatement[] = [];
  let balance = 0;
  let paid = 0;
  let platformFee = 0;
  let salesTax = 0;
  let grandTotal = 0;
  if (array && array.length) {
    orders = array.map((order) => {
      let orderTotal = total(order) / 100;
      const chargeAmount = order.charge
        ? order.charge.amount + order.charge.application_fee_amount
        : 0;
      const platformFeeCharge = order.extraCharges
        ? +order.extraCharges.filter((c) => c.name === 'Platform Fee')[0]?.price
        : 0;
      orderTotal += order.salesTax / 100;
      if (!order.applyPlatformFee) {
        orderTotal -= platformFeeCharge;
      }
      return {
        delivery: formatDate(order.dateOfService, 'MM/DD/YYYY'),
        description: order.name ? order.name : 'Bulk Order',
        vault: order.productOptions ? order.productOptions : false,
        items: order.items ? order.items : false,
        rowspan: order.items ? order.items.length + 1 : 0,
        price: orderTotal,
        platformFee: platformFeeCharge,
        paid: chargeAmount / 100,
        salesTax: order.salesTax,
        balance: !order.charge ? orderTotal : orderTotal - chargeAmount / 100,
        url: `${config.vaultWrx.appUrl}/landing/orders/${order.id}/details`,
      };
    });
    balance = orders.map((order) => +order.balance).reduce(sum, 0);
    paid = orders.map((order) => +order.paid).reduce(sum, 0);
    salesTax = orders.map((order) => +order.salesTax).reduce(sum, 0);
    platformFee = orders.map((order) => +order.platformFee).reduce(sum, 0);
    grandTotal = orders.map((order) => +order.price).reduce(sum, 0);
  }
  return { orders, balance, paid, platformFee, grandTotal, salesTax };
}

export const ordersGroupedByDay = (array: Order[]) => {
  return array.reduce((result: any, item): any => {
    result[item.dateOfService.day] = result[item.dateOfService.day] || [];
    result[item.dateOfService.day].push(item);
    return result;
  }, {});
};

function formatAdminDetailedOrdersForReport(
  array: Order[],
  customers: Customer[],
) {
  let orders: OrderStatement[] = [];
  let platformFeeTotal = 0;
  let grandTotal = 0;
  const salesTax = 0;
  if (array && array.length) {
    orders = array.map((order) => {
      const platformFee =
        order.extraCharges?.find((c) => c.name === 'Platform Fee')?.price || 0;
      const orderTotal = total(order) / 100;
      return {
        delivery: formatDate(order.dateOfService, 'MM/DD/YYYY'),
        customer: customers.find(
          (customer) => customer.id === order.customerRef.id,
        ).name,
        description: order.name || 'Bulk Order',
        url: `${config.vaultWrx.appUrl}/landing/orders/${order.id}/details`,
        salesTax: order.salesTax,
        price: order.applyPlatformFee ? orderTotal : orderTotal - platformFee,
        platformFee,
      };
    });
    grandTotal = orders.map((order) => +order.price).reduce(sum, 0);
    platformFeeTotal = orders.map((order) => +order.platformFee).reduce(sum, 0);
  }
  return { orders, platformFee: platformFeeTotal, grandTotal, salesTax };
}

function generateStatementPDF(
  data: StatementData,
  userType: 'admin' | 'retailer' | 'customer',
) {
  let templateName = 'statement.html';
  if (userType === 'admin') {
    templateName = 'adminStatement.html';
  }
  if (userType === 'retailer') {
    templateName = 'retailerStatement.html';
  }
  return generatePDFs([data], templateName, userType, 'statements').catch((e) =>
    console.log(e),
  );
}

function generateInvoicePDFs(
  dataArray: StatementData[],
  userType: 'admin' | 'retailer',
) {
  let templateName = 'customerInvoice.html';
  if (userType === 'admin') {
    templateName = 'retailerInvoice.html';
  }
  return generatePDFs(dataArray, templateName, userType, 'invoices').catch(
    (e) => console.log(e),
  );
}

function generateDetailedInvoicePDFs(dataArray: StatementData[]) {
  return generatePDFs(
    dataArray,
    'detailedInvoice.html',
    'admin',
    'detailed-invoices',
  );
}

export const generateRetailerStatements = (
  inputDate: Date,
  retailerId: string,
) => {
  const date = moment(inputDate, 'MM/DD/YYYY');

  const retailerRef = admin.firestore().collection('retailers').doc(retailerId);
  const customerQuery = admin
    .firestore()
    .collection('customers')
    .where('retailerRef', '==', retailerRef)
    .where('isDeleted', '==', false);
  const orderQuery = admin
    .firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('retailerRef', '==', retailerRef)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');
  return orderQuery
    .get()
    .then((ordersSnapshot) => {
      const ordersGroupedByCustomer = ordersSnapshot.docs
        .map((documentSnapshot) => {
          const order = documentSnapshot.data() as Order;
          order.id = documentSnapshot.id;
          return order;
        })
        .reduce((result: any, item: any) => {
          (result[item.customerRef.id] =
            result[item.customerRef.id] || []).push(item);
          return result;
        }, {});
      return customerQuery
        .get()
        .then((customersSnapshot) => {
          return retailerRef
            .get()
            .then((retailerSnapshot) => {
              const promises = [];
              const retailer = retailerSnapshot.data() as Retailer;
              const invoicesData: StatementData[] = [];
              customersSnapshot.docs
                .filter((documentSnapshot) => {
                  return ordersGroupedByCustomer[documentSnapshot.id];
                })
                .forEach((customerSnapshot) => {
                  const customer = customerSnapshot.data() as Customer;
                  const discount = +customer.discount / 100;
                  // const salesTax = +customer.salesTax / 100;
                  customer.retailer = retailer;
                  if (customer.hasMultipleLocations) {
                    const ordersGroupedByLocation = ordersGroupedByCustomer[
                      customerSnapshot.id
                    ]
                      .filter((o: any) => o.storeLocation)
                      .reduce((result: any, item: any) => {
                        (result[item.storeLocation.name] =
                          result[item.storeLocation.name] || []).push(item);
                        return result;
                      }, {});
                    customer.locations.forEach((location) => {
                      const formattedOrdersWithLocation = formatOrdersForReport(
                        ordersGroupedByLocation[location.name],
                        discount,
                      );
                      if (formattedOrdersWithLocation.grandTotal !== 0) {
                        invoicesData.push({
                          customerRef: customerSnapshot.ref,
                          name: customer.name,
                          retailerRef: retailerRef,
                          retailer,
                          month: date.format('MMMM YYYY'),
                          data: formattedOrdersWithLocation,
                          location,
                          timestamp: moment
                            .tz('America/New_York')
                            .format('LL hh:mm a'),
                        });
                      }
                    });
                  }
                  const formattedOrders = formatOrdersForReport(
                    ordersGroupedByCustomer[customerSnapshot.id].filter(
                      (o: any) => !o.storeLocation,
                    ),
                    discount,
                  );
                  if (formattedOrders.grandTotal !== 0) {
                    invoicesData.push({
                      customerRef: customerSnapshot.ref,
                      name: customer.name,
                      retailerRef: retailerRef,
                      retailer,
                      month: date.format('MMMM YYYY'),
                      data: formattedOrders,
                      timestamp: moment
                        .tz('America/New_York')
                        .format('LL hh:mm a'),
                    });
                  }
                });
              promises.push(
                generateStatementPDF(
                  {
                    retailerRef: retailerRef,
                    name: retailer.name,
                    month: date.format('MMMM YYYY'),
                    data: formatCustomersForReport(invoicesData),
                    timestamp: moment
                      .tz('America/New_York')
                      .format('LL hh:mm a'),
                  },
                  'retailer',
                ),
              );
              promises.push(generateInvoicePDFs(invoicesData, 'retailer'));
              return Promise.all(promises).catch((err) => console.log(err));
            })
            .catch((e) => console.log(e));
        })
        .catch((e) => console.log(e));
    })
    .catch((e) => console.log(e));
};

export const generateAdminStatements = (inputDate: Date) => {
  const date = moment(inputDate, 'MM/DD/YYYY');
  const customerQuery = admin.firestore().collection('customers');
  const retailerQuery = admin.firestore().collection('retailers');
  const orderQuery = admin
    .firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');
  return orderQuery
    .get()
    .then(async (ordersSnapshot) => {
      const ordersGroupedByRetailer = ordersSnapshot.docs
        .map((documentSnapshot) => {
          const order = documentSnapshot.data() as Order;
          order.id = documentSnapshot.id;
          return order;
        })
        .reduce((result: any, item: any) => {
          (result[item.retailerRef.id] =
            result[item.retailerRef.id] || []).push(item);
          return result;
        }, {});
      return retailerQuery
        .get()
        .then((retailersSnapshot) => {
          return customerQuery
            .get()
            .then(async (customersSnapshot) => {
              const customers = customersSnapshot.docs.map(
                (documentSnapshot) => {
                  const customer = documentSnapshot.data() as Customer;
                  customer.id = documentSnapshot.id;
                  return customer;
                },
              );
              const retailers = retailersSnapshot.docs.map(
                (documentSnapshot) => {
                  const retailer = documentSnapshot.data() as Retailer;
                  retailer.ref = documentSnapshot.ref;
                  retailer.id = documentSnapshot.id;
                  return retailer;
                },
              );
              const adminData: StatementData[] = [];
              for (const retailer of retailers) {
                const orders = ordersGroupedByRetailer[retailer.id] as Order[];
                if (orders) {
                  const groupedByDay = ordersGroupedByDay(orders);
                  const detailedInvoicesData: StatementData[] = [];
                  for (const day of Object.keys(groupedByDay)) {
                    detailedInvoicesData.push({
                      retailerRef: retailer.ref,
                      name: retailer.name,
                      month: moment({
                        year: date.year(),
                        month: date.month(),
                        day: +day,
                      }).format('MM/DD/YYYY'),
                      data: formatAdminDetailedOrdersForReport(
                        groupedByDay[day],
                        customers,
                      ),
                      timestamp: moment
                        .tz('America/New_York')
                        .format('LL hh:mm a'),
                    });
                  }
                  await generateDetailedInvoicePDFs(detailedInvoicesData);
                  const data = await formatAdminOrdersForReport(
                    orders,
                    retailer.id,
                  );
                  adminData.push({
                    retailerRef: retailer.ref,
                    name: retailer.name,
                    month: date.format('MMMM YYYY'),
                    data,
                    timestamp: moment
                      .tz('America/New_York')
                      .format('LL hh:mm a'),
                  });
                }
              }
              const promises = [];
              promises.push(
                generateStatementPDF(
                  {
                    name: 'VaultWrx',
                    month: date.format('MMMM YYYY'),
                    data: formatRetailersForReport(adminData),
                    timestamp: moment
                      .tz('America/New_York')
                      .format('LL hh:mm a'),
                  },
                  'admin',
                ),
              );
              promises.push(
                generateInvoicePDFs(
                  adminData.sort((a, b) => {
                    if (a.name > b.name) {
                      return -1;
                    }
                    if (a.name > b.name) {
                      return 1;
                    }
                    return 0;
                  }),
                  'admin',
                ),
              );
              await Promise.all(promises);
              const snapshot = await admin.firestore().collection('temp').get();
              for (const documentSnapshot of snapshot.docs) {
                await admin
                  .firestore()
                  .doc(`temp/${documentSnapshot.id}`)
                  .delete()
                  // eslint-disable-next-line @typescript-eslint/no-loop-func
                  .catch((err: any) => {
                    console.log(err);
                  });
              }
            })
            .catch((error) => {
              throw error;
            });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

export const generateCustomerStatements = (
  inputDate: Date,
  customerId: string,
) => {
  const date = moment(inputDate, 'MM/DD/YYYY');
  const customerRef = admin.firestore().collection('customers').doc(customerId);
  const orderQuery = admin
    .firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('customerRef', '==', customerRef)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');
  return orderQuery
    .get()
    .then((ordersSnapshot) => {
      return customerRef
        .get()
        .then((customerSnapshot) => {
          const promises = [];
          const customer = customerSnapshot.data() as Customer;
          const discount = +customer.discount / 100;
          // const salesTax = +customer.salesTax /100;
          const orders = ordersSnapshot.docs.map(
            (orderSnapshot) => orderSnapshot.data() as Order,
          );
          promises.push(
            generateStatementPDF(
              {
                customerRef: customerSnapshot.ref,
                name: customer.name,
                month: date.format('MMMM YYYY'),
                data: formatOrdersForReport(orders, discount),
                timestamp: moment.tz('America/New_York').format('LL hh:mm a'),
              },
              'customer',
            ),
          );
          Promise.all(promises).catch((err) => console.log(err));
        })
        .catch((e) => console.log(e));
    })
    .catch((e) => console.log(e));
};

export const generateCustomerInvoices = (
  monthYear: string,
  customerName: string,
) => {
  const date = moment(monthYear, 'MMMM YYYY');
  const customerQuery = admin
    .firestore()
    .collection('customers')
    .where('name', '==', customerName)
    .where('isDeleted', '==', false);
  const orderQuery = admin
    .firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');
  return orderQuery
    .get()
    .then((ordersSnapshot) => {
      const ordersGroupedByCustomer = ordersSnapshot.docs
        .map((documentSnapshot) => {
          return documentSnapshot.data() as Order;
        })
        .reduce((result: any, item: any) => {
          (result[item.customerRef.id] =
            result[item.customerRef.id] || []).push(item);
          return result;
        }, {});
      return customerQuery
        .get()
        .then((customersSnapshot) => {
          console.log('customers', customersSnapshot.docs);
          const customer = customersSnapshot.docs[0].data() as Customer;
          const discount = +customer.discount / 100;
          // const salesTax= +customer.salesTax / 100;
          customer.retailerRef
            .get()
            .then((retailerSnapshot) => {
              const retailer = retailerSnapshot.data() as Retailer;
              const invoicesData: StatementData[] = [];
              customer.retailer = retailer;
              if (customer.hasMultipleLocations) {
                const ordersGroupedByLocation = ordersGroupedByCustomer[
                  customersSnapshot.docs[0].id
                ]
                  .filter((o: any) => o.storeLocation)
                  .reduce((result: any, item: any) => {
                    (result[item.storeLocation.name] =
                      result[item.storeLocation.name] || []).push(item);
                    return result;
                  }, {});
                customer.locations.forEach((location) => {
                  invoicesData.push({
                    customerRef: customersSnapshot.docs[0].ref,
                    name: customer.name,
                    retailerRef: retailerSnapshot.ref,
                    retailer,
                    month: monthYear,
                    data: formatOrdersForReport(
                      ordersGroupedByLocation[location.name],
                      discount,
                    ),
                    location,
                    timestamp: moment
                      .tz('America/New_York')
                      .format('LL hh:mm a'),
                  });
                });
              }
              invoicesData.push({
                customerRef: customersSnapshot.docs[0].ref,
                name: customer.name,
                retailerRef: retailerSnapshot.ref,
                retailer,
                month: monthYear,
                data: formatOrdersForReport(
                  ordersGroupedByCustomer[customersSnapshot.docs[0].id].filter(
                    (o: any) => !o.storeLocation,
                  ),
                  discount,
                ),
                timestamp: moment.tz('America/New_York').format('LL hh:mm a'),
              });
              return generateInvoicePDFs(
                invoicesData.sort((a, b) => {
                  if (a.name > b.name) {
                    return -1;
                  }
                  if (a.name > b.name) {
                    return 1;
                  }
                  return 0;
                }),
                'retailer',
              ).catch((err) => console.log(err));
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

export const deleteFailedStatements = async () => {
  const files = await bucket.getFiles();
  for (const file of files[0]) {
    if (+file.metadata.size === 0) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await file.delete().catch((err: any) => console.log(err));
      console.log('File deleted', file.name);
      const metadata: any = file.metadata.metadata;
      if (metadata && metadata.customer) {
        await generateCustomerInvoices(metadata.date, metadata.customer);
      }
    }
  }
};

export const generateAllStatements = async (date = new Date()) => {
  const retailerQuery = admin.firestore().collection('retailers');
  const customerQuery = admin
    .firestore()
    .collection('customers')
    .where('isDeleted', '==', false);
  const promises = [];
  const retailersSnapshot = await retailerQuery.get();
  retailersSnapshot.docs.map((retailerSnapshot) => {
    promises.push(generateRetailerStatements(date, retailerSnapshot.id));
  });
  const customersSnapshot = await customerQuery.get();
  customersSnapshot.docs.map((customerSnapshot) => {
    promises.push(generateCustomerStatements(date, customerSnapshot.id));
  });
  promises.push(generateAdminStatements(date));
  return Promise.all(promises).catch((err) => console.log(err));
};
