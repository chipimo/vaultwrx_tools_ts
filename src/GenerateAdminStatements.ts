import moment from "moment-timezone";

import {
  Customer,
  Order,
  Option,
  OrderStatement,
  Retailer,
  StatementData,
  DetailedInvoice,
} from "./model";
import { formatDate, total } from ".";
import config from "./config/config";
import { generatePDFs } from "./generatePDFs";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./dev_config/serviceAccountKeyDev.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const bucket = admin
  .storage()
  .bucket("gs://" + config.vaultWrx.domain + ".appspot.com/");

const sum = (result: number, item: number) => result + item;

const ordersGroupedByDay = (array: Order[]) => {
  return array.reduce((result, item) => {
    result[item.dateOfService.day] = result[item.dateOfService.day] || [];
    result[item.dateOfService.day].push(item);
    return result;
  }, {});
};

function formatAdminDetailedOrdersForReport(
  array: Order[],
  customers: Customer[]
) {
  let orders: OrderStatement[] = [];
  let platformFeeTotal = 0;
  let grandTotal = 0;
  const salesTax = 0;
  if (array && array.length) {
    orders = array.map((order) => {
      const platformFee =
        order.extraCharges?.find((c) => c.name === "Platform Fee")?.price || 0;
      const orderTotal = total(order) / 100;
      return {
        delivery: formatDate(order.dateOfService, "MM/DD/YYYY"),
        customer: customers.find(
          (customer) => customer.id === order.customerRef.id
        ).name,
        description: order.name || "Bulk Order",
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

function generateDetailedInvoicePDFs(dataArray: StatementData[]) {
  return generatePDFs(
    dataArray,
    "detailedInvoice.html",
    "admin",
    "detailed-invoices"
  );
}

export function formatCustomersForReport(array: StatementData[]) {
  let customers: StatementData[] = [];
  let balance = 0;
  let paid = 0;
  let platformFee = 0;
  let grandTotal = 0;
  let salesTax = 0;
  if (array && array.length) {
    customers = array;
    balance = customers
      .map((customer) => +customer.data.balance)
      .reduce(sum, 0);
    paid = customers.map((customer) => +customer.data.paid).reduce(sum, 0);
    salesTax = customers
      .map((customer) => +customer.data.salesTax)
      .reduce(sum, 0);
    platformFee = customers
      .map((customer) => +customer.data.platformFee)
      .reduce(sum, 0);
    grandTotal = customers
      .map((customer) => +customer.data.grandTotal)
      .reduce(sum, 0);
  }
  return {
    customers: customers.sort((a, b) => {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    }),
    balance,
    paid,
    grandTotal,
    platformFee,
    salesTax,
  };
}

async function formatAdminOrdersForReport(array: Order[], retailerId: string) {
  try {
    const orders: OrderStatement[] = [];
    let platformFeeTotal = 0;
    let grandTotal = 0;
    const salesTax = 0;
    if (array && array.length) {
      const groupedByDay = ordersGroupedByDay(array);
      for (const day of Object.keys(groupedByDay)) {
        const groupedOrders = groupedByDay[day] as Order[];
        if (groupedOrders) {
          const extraCharges = [].concat(
            ...groupedOrders.map((o) => o.extraCharges).filter((c) => c)
          ) as Option[];
          const platformFee = extraCharges
            .map((c) => {
              if (c.name === "Platform Fee") {
                return +c.price;
              }
              return 0;
            })
            .reduce(sum, 0);
          const documentSnapshot = await admin
            .firestore()
            .doc(`temp/${retailerId}`)
            .get();
          const detailedInvoice = documentSnapshot.data() as DetailedInvoice;
          const delivery = formatDate(
            groupedOrders[0].dateOfService,
            "MM/DD/YYYY"
          );
          const invoice = detailedInvoice?.detailedInvoices.find(
            (i) => i.date === delivery
          );
          if (invoice) {
            const signedUrls = await bucket.file(invoice.path).getSignedUrl({
              action: "read",
              expires: moment().add(1, "year").toDate(),
            });
            orders.push({
              delivery,
              description: `${groupedOrders.length} orders`,
              url: signedUrls[0],
              price: groupedOrders
                .map((order) => {
                  const orderTotal = total(order) / 100;
                  const platformFeeCharge = order.extraCharges
                    ? +order.extraCharges.filter(
                        (c) => c.name === "Platform Fee"
                      )[0]?.price
                    : 0;
                  return order.applyPlatformFee
                    ? orderTotal
                    : orderTotal - platformFeeCharge;
                })
                .reduce(sum, 0),
              salesTax: orders.map((order) => +order.salesTax).reduce(sum, 0),
              platformFee,
            });
          }
        }
      }
      grandTotal = orders.map((order) => +order.price).reduce(sum, 0);
      platformFeeTotal = orders
        .map((order) => +order.platformFee)
        .reduce(sum, 0);
    }
    return { orders, platformFee: platformFeeTotal, grandTotal, salesTax };
  } catch (err) {
    throw err;
  }
}

export function formatOrdersForReport(array: Order[], discount: number) {
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
        ? +order.extraCharges.filter((c) => c.name === "Platform Fee")[0]?.price
        : 0;
      orderTotal += order.salesTax / 100;
      if (!order.applyPlatformFee) {
        orderTotal -= platformFeeCharge;
      }
      return {
        delivery: formatDate(order.dateOfService, "MM/DD/YYYY"),
        description: order.name ? order.name : "Bulk Order",
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

export function generateStatementPDF(
  data: StatementData,
  userType: "admin" | "retailer" | "customer"
) {
  let templateName = "statement.html";
  if (userType === "admin") {
    templateName = "adminStatement.html";
  }
  if (userType === "retailer") {
    templateName = "retailerStatement.html";
  }
  return generatePDFs([data], templateName, userType, "statements").catch((e) =>
    console.log(e)
  );
}

export function generateInvoicePDFs(
  dataArray: StatementData[],
  userType: "admin" | "retailer"
) {
  let templateName = "customerInvoice.html";
  if (userType === "admin") {
    templateName = "retailerInvoice.html";
  }
  return generatePDFs(dataArray, templateName, userType, "invoices").catch(
    (e) => console.log(e)
  );
}

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

export const generateAdminStatements = (inputDate: Date) => {
  const date = moment(inputDate);
  const customerQuery = admin.firestore().collection("customers");
  const retailerQuery = admin.firestore().collection("retailers");
  const orderQuery = admin
    .firestore()
    .collection("orders")
    .where("isEdited", "==", false)
    .where("isDeleted", "==", false)
    .where("dateOfService.month", "==", parseInt(date.format("M"), 10))
    .where("dateOfService.year", "==", date.year())
    .orderBy("dateOfService");
  return orderQuery
    .get()
    .then(async (ordersSnapshot: { docs: any[] }) => {
      const ordersGroupedByRetailer = ordersSnapshot.docs
        .map((documentSnapshot: { data: () => any; id: any }) => {
          const order = documentSnapshot.data() as Order;
          order.id = documentSnapshot.id;
          return order;
        })
        .reduce((result, item): any => {
          //@ts-ignore
          (result[item["retailerRef"].id] =
            //@ts-ignore
            result[item["retailerRef"].id] || []).push(item);
          return result;
        }, {});
      return retailerQuery
        .get()
        .then((retailersSnapshot: { docs: any[] }) => {
          return customerQuery
            .get()
            .then(async (customersSnapshot: { docs: any[] }) => {
              const customers = customersSnapshot.docs.map(
                (documentSnapshot: { data: () => any; id: any }) => {
                  const customer = documentSnapshot.data() as Customer;
                  customer.id = documentSnapshot.id;
                  return customer;
                }
              );
              const retailers = retailersSnapshot.docs.map(
                (documentSnapshot: { data: () => any; ref: any; id: any }) => {
                  const retailer = documentSnapshot.data() as Retailer;
                  retailer.ref = documentSnapshot.ref;
                  retailer.id = documentSnapshot.id;
                  return retailer;
                }
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
                      }).format("MM/DD/YYYY"),
                      data: formatAdminDetailedOrdersForReport(
                        groupedByDay[day],
                        customers
                      ),
                      timestamp: moment
                        .tz("America/New_York")
                        .format("LL hh:mm a"),
                    });
                  }
                  await generateDetailedInvoicePDFs(detailedInvoicesData);
                  const data = await formatAdminOrdersForReport(
                    orders,
                    retailer.id
                  );
                  adminData.push({
                    retailerRef: retailer.ref,
                    name: retailer.name,
                    month: date.format("MMMM YYYY"),
                    data,
                    timestamp: moment
                      .tz("America/New_York")
                      .format("LL hh:mm a"),
                  });
                }
              }
              const promises = [];
              promises.push(
                generateStatementPDF(
                  {
                    name: "VaultWrx",
                    month: date.format("MMMM YYYY"),
                    data: formatRetailersForReport(adminData),
                    timestamp: moment
                      .tz("America/New_York")
                      .format("LL hh:mm a"),
                  },
                  "admin"
                )
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
                  "admin"
                )
              );
              await Promise.all(promises);
              const snapshot = await admin.firestore().collection("temp").get();
              for (const documentSnapshot of snapshot.docs) {
                await admin
                  .firestore()
                  .doc(`temp/${documentSnapshot.id}`)
                  .delete()
                  .catch((err: any) => console.log(err));
              }
            })
            .catch((error: any) => {
              throw error;
            });
        })
        .catch((err: any) => console.log(err));
    })
    .catch((err: any) => console.log(err));
};
