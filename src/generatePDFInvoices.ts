import moment from 'moment';
const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./dev_config/serviceAccountKeyDev.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const generateAdminInvoices = async (inputDate: Date) => {
  const date = moment(inputDate, 'MM/DD/YYYY');
  const orderQuery = admin
    .firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');

  try {
    const ordersSnapshot = await orderQuery.get();
    const orders = ordersSnapshot.docs.map((doc: any) => {
      const order = doc.data();
      order.id = doc.id;
      return order;
    });

    // Group orders by retailer
    const ordersGroupedByRetailer = orders.reduce((acc: any, order: any) => {
      const retailerId = order.retailerRef.id;
      if (!acc[retailerId]) {
        acc[retailerId] = [];
      }
      acc[retailerId].push(order);
      return acc;
    }, {});

    // Iterate over each retailer's orders
    for (const retailerId of Object.keys(ordersGroupedByRetailer)) {
      // Fetch retailer info from Firestore using retailerId
      const retailerDoc = await admin
        .firestore()
        .collection('retailers')
        .doc(retailerId)
        .get();
      const retailerData = retailerDoc.data();

      if (!retailerData) {
        console.log(`Retailer with ID ${retailerId} not found.`);
        continue;
      }

      const retailerName = retailerData.name || 'Unknown Retailer'; // Use retailer name, or default if not available

      const retailerOrders = ordersGroupedByRetailer[retailerId];

      // Group orders by day for the current retailer
      const ordersByDay = retailerOrders.reduce((acc: any, order: any) => {
        const day = moment(order.dateOfService).format('MM/DD/YYYY');
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(order);
        return acc;
      }, {});

      // Calculate totals for the current retailer
      let totalPlatformFee = 0;

      // Accumulate platform fees, sales tax, and total price for all orders
      retailerOrders.forEach((order: any) => {
        // Move total() inside the loop to ensure safe referencing
        const platformFeeCharge = order.extraCharges
          ? +order.extraCharges.filter((c: any) => c.name === 'Platform Fee')[0]
            ?.price || 0
          : 0;

        totalPlatformFee += platformFeeCharge;
      });

      // Create a new PDF document for the current retailer
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `invoices/invoice_${retailerName}_${date.format(
        'YYYY_MM',
      )}.pdf`;
      doc.pipe(fs.createWriteStream(fileName));

      // Add full date stamp in the top right corner
      doc
        .fontSize(10)
        .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, {
          align: 'right',
        });

      // Add header for the retailer's invoice with retailer details and the full month name
      doc.moveDown();
      doc.fontSize(18).text(`${retailerName} - ${date.format('MMMM')}`, {
        align: 'left',
      });
      doc.moveDown();

      // Table with Date, Description, and Platform Fee for the current retailer
      const tableData = Object.keys(ordersByDay).map((day) => {
        const dailyOrders = ordersByDay[day];
        const totalOrders = dailyOrders.length;
        const platformFee = dailyOrders.reduce(
          (sum: number, order: any) =>
            sum +
            (order.extraCharges?.filter(
              (c: any) => c.name === 'Platform Fee',
            )[0]?.price || 0),
          0,
        );

        return {
          Date: day,
          Description: `${totalOrders} orders`,
          'Platform Fee': `$${platformFee.toFixed(2)}`,
        };
      });

      // Generate the table in the PDF for the current retailer
      doc.table({
        headers: ['Date', 'Description', 'Platform Fee'],
        rows: tableData.map((item) => [
          item.Date,
          item.Description,
          item['Platform Fee'],
        ]),
      });

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Platform Fees: $${totalPlatformFee.toFixed(2)}`, {
          align: 'right',
        });

      // End the PDF document for the current retailer
      doc.end();

      console.log(
        `PDF generated for Retailer: ${retailerName}, saved as ${fileName}`,
      );
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
