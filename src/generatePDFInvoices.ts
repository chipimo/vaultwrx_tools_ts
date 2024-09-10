import pdfkit from 'pdfkit';
import { firestore } from 'firebase-admin';
import moment from 'moment';

export const generateAdminStatements = async (inputDate: Date) => {
  const date = moment(inputDate);
  const orderQuery = firestore()
    .collection('orders')
    .where('isEdited', '==', false)
    .where('isDeleted', '==', false)
    .where('dateOfService.month', '==', parseInt(date.format('M'), 10))
    .where('dateOfService.year', '==', date.year())
    .orderBy('dateOfService');

  try {
    const ordersSnapshot = await orderQuery.get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());

    // Group orders by day
    const ordersByDay = orders.reduce((acc: any, order: any) => {
      const day = moment(order.dateOfService).format('MM/DD/YYYY');
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(order);
      return acc;
    }, {});

    // Create a new PDF document
    const doc = new pdfkit();
    doc.pipe(fs.createWriteStream('invoice.pdf'));

    // Add table header
    doc.fontSize(18).text('Admin Statement', { align: 'center' });
    doc.moveDown();

    // Table with Date, Description, and Platform Fee
    const tableData = Object.keys(ordersByDay).map((day) => {
      const dailyOrders = ordersByDay[day];
      const totalOrders = dailyOrders.length;
      const platformFee = dailyOrders.reduce((sum: number, order: any) => sum + (order.platformFee || 0), 0);
      
      return {
        Date: day,
        Description: `${totalOrders} orders`,
        'Platform Fee': `$${platformFee.toFixed(2)}`
      };
    });

    // Generate the table in the PDF
    doc.table({
      headers: ['Date', 'Description', 'Platform Fee'],
      rows: tableData.map(item => [item.Date, item.Description, item['Platform Fee']])
    });

    doc.end();
  } catch (err) {
    console.error(err);
    throw err;
  }
};
