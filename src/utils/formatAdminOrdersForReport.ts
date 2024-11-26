/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DetailedInvoice,
  Option,
  Order,
  OrderStatement,
} from '../model';
import * as admin from 'firebase-admin';
import moment from 'moment-timezone';
import { formatDate, total } from '.';
import { bucket, ordersGroupedByDay, sum } from './statements';

export async function formatAdminOrdersForReport(array: Order[], retailerId: string) {
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
            ...groupedOrders.map((o) => o.extraCharges).filter((c) => c),
          ) as Option[];
          const platformFee = extraCharges
            .map((c) => {
              if (c.name === 'Platform Fee') {
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
            'MM/DD/YYYY',
          );
          const invoice = detailedInvoice?.detailedInvoices.find(
            (i) => i.date === delivery,
          );
          if (invoice) {
            const signedUrls = await bucket.file(invoice.path).getSignedUrl({
              action: 'read',
              expires: moment().add(1, 'year').toDate(),
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
                      (c) => c.name === 'Platform Fee',
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