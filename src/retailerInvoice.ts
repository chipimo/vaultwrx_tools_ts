// import  PDFDocument  from 'pdfkit';
const PDFDocument = require('pdfkit');
const fs = require('fs');

export function createInvoice(data: any) {
  const doc = new PDFDocument({ margin: 50 });
  const outputPath = `invoices/detailed/${data.name} - ${data.month}.pdf`;

  // Pipe the output to a file
  doc.pipe(fs.createWriteStream(outputPath));

  // Fonts and styles
  doc.fontSize(10);

  // Header - Name and Month
  doc.fontSize(18).text(`${data.name}`, { align: 'left' });
  doc.fontSize(18).text(`${data.month}`, { align: 'left' });

  // Timestamp
  doc.fontSize(12).text(`${data.timestamp}`, { align: 'right', moveDown: 1 });

  // Space between header and table
  doc.moveDown(2);

  // Table Header
  doc.fontSize(12).text('Date', 50, doc.y, { align: 'left' });
  doc.text('Description', 200, doc.y, { align: 'left' });
  doc.text('Platform Fee', 400, doc.y, { align: 'right' });

  // Draw a line below the header
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  // Space between header and body
  doc.moveDown(0.5);

  // Table Body
  data.data.orders.forEach((order: any) => {
    doc.text(order.delivery, 50, doc.y, { align: 'left' });
    doc.text(order.description, 200, doc.y, { align: 'left' });
    doc.text(`$${order.platformFee}`, 400, doc.y, { align: 'right' });
    doc.moveDown(0.5);
  });

  // Space between body and footer
  doc.moveDown(1);

  // Table Footer (Total)
  doc.fontSize(12).text('Total', 200, doc.y, { align: 'left' });
  doc.text(`$${data.platformFee}`, 400, doc.y, { align: 'right' });

  // Finalize the PDF and end the stream
  doc.end();
}
