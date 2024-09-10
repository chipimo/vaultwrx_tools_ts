// import  PDFDocument  from 'pdfkit';
const PDFDocument = require('pdfkit-table');
const fs = require('fs'); // Import the regular fs module for createWriteStream
const fsPromises = require('fs').promises; // Use fs.promises for promise-based functions
const path = require('path');

async function ensureDirectoryExists(outputPath: string) {
  try {
    const dirPath = path.dirname(outputPath);
    await fsPromises.mkdir(dirPath, { recursive: true });
    console.log(`Directory created or already exists: ${dirPath}`);
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
  }
}

export async function createInvoice(data: any) {
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `${data.name} - ${data.month}.pdf`;

  const filePath = `./invoices/detailed/${fileName}`;
  await ensureDirectoryExists(filePath);

  const outputPath = filePath;

  // Pipe the output to a file
  doc.pipe(fs.createWriteStream(outputPath));

  // Fonts and styles
  doc.fontSize(10);
  
  // Timestamp
  doc.fontSize(9).text(`${data.timestamp}`, { align: 'right', moveDown: 1 });

  // Header - Name and Month
  doc.fontSize(17).text(`${data.name}`, { align: 'left' });
  doc.fontSize(17).text(`${data.month}`, { align: 'left' });

  // Space between header and body
  doc.moveDown(0.5);

  // Initialize a variable to hold the total platform fee
  let totalPlatformFee = 0;

  // Table Data
  console.log(data.data.orders);
  
  const tableData = data.data.orders.map((order: any) => {
    totalPlatformFee += order.platformFee;
    return [
      `${order.delivery}`,
      `${order.description}`,
      `$${order.platformFee}`,
    ];
  });
  
  // Table Header
  const table = {
    headers: [
      { label: 'Date', align: 'left' },
      { label: 'Description', align: 'left' },
      { label: 'Platform Fee', align: 'right' },
    ],
    rows: tableData,
  };
  
  // Add Table to Document
  await doc.table(table, {
    prepareHeader: () => doc.fontSize(12),
    prepareRow: () => doc.fontSize(10),
  });
  

  // Space between body and footer
  doc.moveDown(1);

  // Table Footer (Total)
  const footerYPosition = doc.y - 10; // Move up by 50 points, adjust as needed
  doc.fontSize(12).text('Total', 250, footerYPosition, { align: 'left' });
  doc.text(`$${totalPlatformFee.toFixed(2)}`, 300, footerYPosition, { align: 'right' });

  // Finalize the PDF and end the stream
  doc.end();
}
