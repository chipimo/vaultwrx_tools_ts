import moment from "moment-timezone";
import { formatOrdersForReport, generateStatementPDF, generateInvoicePDFs, formatCustomersForReport } from "./GenerateAdminStatements";
import { Order, Retailer, StatementData, Customer } from "./model";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./dev_config/serviceAccountKeyDev.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const generateRetailerStatements = (
    inputDate: Date,
    retailerId: string
  ) => {
    const date = moment(inputDate);
    const retailerRef = admin.firestore().collection("retailers").doc(retailerId);
    const customerQuery = admin
      .firestore()
      .collection("customers")
      .where("retailerRef", "==", retailerRef)
      .where("isDeleted", "==", false);
    const orderQuery = admin
      .firestore()
      .collection("orders")
      .where("isEdited", "==", false)
      .where("isDeleted", "==", false)
      .where("retailerRef", "==", retailerRef)
      .where("dateOfService.month", "==", parseInt(date.format("M"), 10))
      .where("dateOfService.year", "==", date.year())
      .orderBy("dateOfService");
    return orderQuery
      .get()
      .then((ordersSnapshot) => {
        const ordersGroupedByCustomer = ordersSnapshot.docs
          .map((documentSnapshot) => {
            const order = documentSnapshot.data() as Order;
            order.id = documentSnapshot.id;
            return order;
          })
          .reduce((result, item) => {
            (result[item["customerRef"].id] =
              result[item["customerRef"].id] || []).push(item);
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
                        .filter((o) => o.storeLocation)
                        .reduce((result, item) => {
                          (result[item["storeLocation"].name] =
                            result[item["storeLocation"].name] || []).push(item);
                          return result;
                        }, {});
                      customer.locations.forEach((location) => {
                        const formattedOrdersWithLocation = formatOrdersForReport(
                          ordersGroupedByLocation[location.name],
                          discount
                        );
                        if (formattedOrdersWithLocation.grandTotal !== 0) {
                          invoicesData.push({
                            customerRef: customerSnapshot.ref,
                            name: customer.name,
                            retailerRef: retailerRef,
                            retailer,
                            month: date.format("MMMM YYYY"),
                            data: formattedOrdersWithLocation,
                            location,
                            timestamp: moment
                              .tz("America/New_York")
                              .format("LL hh:mm a"),
                          });
                        }
                      });
                    }
                    const formattedOrders = formatOrdersForReport(
                      ordersGroupedByCustomer[customerSnapshot.id].filter(
                        (o) => !o.storeLocation
                      ),
                      discount
                    );
                    if (formattedOrders.grandTotal !== 0) {
                      invoicesData.push({
                        customerRef: customerSnapshot.ref,
                        name: customer.name,
                        retailerRef: retailerRef,
                        retailer,
                        month: date.format("MMMM YYYY"),
                        data: formattedOrders,
                        timestamp: moment
                          .tz("America/New_York")
                          .format("LL hh:mm a"),
                      });
                    }
                  });
                promises.push(
                  generateStatementPDF(
                    {
                      retailerRef: retailerRef,
                      name: retailer.name,
                      month: date.format("MMMM YYYY"),
                      data: formatCustomersForReport(invoicesData),
                      timestamp: moment
                        .tz("America/New_York")
                        .format("LL hh:mm a"),
                    },
                    "retailer"
                  )
                );
                promises.push(generateInvoicePDFs(invoicesData, "retailer"));
                return Promise.all(promises).catch((err) => console.log(err));
              })
              .catch((e) => console.log(e));
          })
          .catch((e) => console.log(e));
      })
      .catch((e) => console.log(e));
  };