import moment from 'moment';
import { CustomDate, Order } from './model';

const OUTPUT_FORMAT = 'dddd, MM/DD/YYYY';

/**
 * Calculates the total price of an order.
 * @param order - The order object containing the items, product options, service type, service extras, extra charges, and discount.
 * @returns The total price of the order in cents.
 */
export const total = (order: Order) => {
  let retval = 0;
  if (!order.items && order.productOptions) {
    retval = +order.productOptions.price;
    if (order.serviceType) {
      retval += +order.serviceType.price;
    }
    if (order.serviceExtras) {
      order.serviceExtras.forEach((extra) => (retval += +extra.price));
    }
  } else if (order.items) {
    // @ts-ignore
    order.items.forEach((item) => (retval += +item.price * +item.qty));
  }
  if (order.extraCharges) {
    order.extraCharges.forEach((extra) => (retval += +extra.price));
  }
  if (order.discount) {
    retval -= order.discount;
  }
  // if (order.salesTax) {
  //   retval *= order.salesTax
  // }
  return retval * 100;
};

export const formatDate = (input: CustomDate, format = OUTPUT_FORMAT) => {
  try {
    const dateOfService = moment([input.year, input.month - 1, input.day]);
    return dateOfService.format(format);
  } catch (err) {
    throw err;
  }
};
