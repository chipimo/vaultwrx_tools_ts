import moment from "moment";
import { Customer, Order, OrderStatement, Retailer, StatementData } from "./model";
import { formatDate, total } from ".";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./dev_config/serviceAccountKeyDev.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
