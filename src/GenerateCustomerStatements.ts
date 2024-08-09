import moment from "moment-timezone";
import { Customer, Order } from "./model";
import { formatOrdersForReport, generateStatementPDF } from "./GenerateAdminStatements";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./dev_config/serviceAccountKeyDev.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const generateCustomerStatements = (
    inputDate: Date,
    customerId: string
  ) => {
    const date = moment(inputDate);
    const customerRef = admin.firestore().collection("customers").doc(customerId);
    const orderQuery = admin
      .firestore()
      .collection("orders")
      .where("isEdited", "==", false)
      .where("isDeleted", "==", false)
      .where("customerRef", "==", customerRef)
      .where("dateOfService.month", "==", parseInt(date.format("M"), 10))
      .where("dateOfService.year", "==", date.year())
      .orderBy("dateOfService");
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
              (orderSnapshot) => orderSnapshot.data() as Order
            );
            promises.push(
              generateStatementPDF(
                {
                  customerRef: customerSnapshot.ref,
                  name: customer.name,
                  month: date.format("MMMM YYYY"),
                  data: formatOrdersForReport(orders, discount),
                  timestamp: moment.tz("America/New_York").format("LL hh:mm a"),
                },
                "customer"
              )
            );
            Promise.all(promises).catch((err) => console.log(err));
          })
          .catch((e) => console.log(e));
      })
      .catch((e) => console.log(e));
  };