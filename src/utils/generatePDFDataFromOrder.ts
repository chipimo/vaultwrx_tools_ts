/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Customer,
  Order,
  PDFData,
  Retailer,
  Staff,
} from '../model';
import { formatDate, formatTime } from '.';

export const generatePDFDataFromOrder = (
  order: Order,
  customer: Customer,
  retailer: Retailer,
  director: Staff,
  heading: string,
  subjectPrefix: string = '',
) => {
  let data: PDFData = {
    heading: heading,
    id: order.id,
    contact: director.name,
    email: director.email,
    cellPhone: director.cellPhone,
    dateOfService: formatDate(order.dateOfService),
    comments: order.comments,
    retailer: false,
    showConfirm: false,
    customerName: customer.name,
    retailerFax: retailer.fax,
    showPrice: false,
    salesTax: order.salesTax,
  };
  let subject = 'Bulk Vault Order';
  if (!order.items) {
    subject = `${subjectPrefix} ${order.name} Vault Order`;
    data = {
      ...data,
      subject: subject,
      name: order.name,
      arrivalTime: formatTime(order.arrivalTime),
      timeOfService: formatTime(order.timeOfService),
      birthYear: order.birthDate.year.toString(),
      cemetery: order.cemetery,
      deathYear: order.deathDate.year.toString(),
      location: order.location,
      productPaintColorOptions: order.productPaintColorOptions,
      emblem: order.emblem,
      productOptions: order.productOptions,
      salesTax: order.salesTax,
      serviceExtras: order.serviceExtras,
      extraCharges: order.extraCharges,
      serviceType: order.serviceType,
      bulk: false,
    };
  } else {
    data.subject = subject;
    data.bulk = true;
    data.items = order.items;
  }
  return data;
};