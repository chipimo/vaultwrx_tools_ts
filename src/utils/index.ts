/* eslint-disable @typescript-eslint/no-unused-vars */
import * as admin from 'firebase-admin';
import moment from 'moment';
import {
  Notifications,
  Order,
  TaskOptions,
  CustomDate,
  CustomTime,
  Staff,
} from '../model';

const OUTPUT_FORMAT = 'dddd, MM/DD/YYYY';
export const getNotificationSettings = (
  ref: admin.firestore.DocumentReference,
) => {
  return ref
    .get()
    .then((settings) => {
      return settings.data() as Notifications;
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const formatMinute = (minute: number) => {
  if (minute > 59) {
    throw Error('Minute should not be greater than 59');
  }
  if (minute < 10) {
    return '0' + minute;
  } else {
    return minute.toString();
  }
};

export const formatTime = (time: CustomTime) => {
  if (time.hour > 24) {
    throw Error("Property 'hour' cannot exceed 24");
  }
  if (time.hour > 12) {
    return time.hour - 12 + ':' + formatMinute(time.minute) + ' PM';
  } else if (time.hour === 12) {
    return time.hour + ':' + formatMinute(time.minute) + ' PM';
  } else if (time.hour === 0) {
    return 12 + ':' + formatMinute(time.minute) + ' AM';
  } else {
    return time.hour + ':' + formatMinute(time.minute) + ' AM';
  }
};

export const formatDate = (input: CustomDate, format = OUTPUT_FORMAT) => {
  try {
    const dateOfService = moment([input.year, input.month - 1, input.day]);
    return dateOfService.format(format);
  } catch (err) {
    throw err;
  }
};

export const getSMSMessage = (order: any, director: Staff, staff?: Staff) => {
  //(staff != null ? staff.name + ', ' + staff.cellPhone : 'NONE ASSIGNED')
  let vaultSetter = 'NONE ASSIGNED';
  if (staff != null) {
    vaultSetter = `${staff.name}, ${staff.cellPhone}`;
  }

  if (order.items) {
    return (
      '\n Order Contact: ' +
      director.name +
      ', ' +
      director.cellPhone +
      '\n Delivery Contact: ' +
      vaultSetter +
      '\n Delivery By: ' +
      formatDate(order.dateOfService) +
      '\n Service type: ' +
      order.serviceType?.name
    );
  }
  return (
    '\n Funeral Contact: ' +
    director.name +
    ', ' +
    director.cellPhone +
    '\n Delivery Contact: ' +
    vaultSetter +
    '\n Deceased: ' +
    order.name +
    '\n Date of Service: ' +
    formatDate(order.dateOfService) +
    '\n Time of Service: ' +
    formatTime(order.timeOfService) +
    '\n Service Location: ' +
    order.location +
    '\n Cemetery Location: ' +
    order.cemetery +
    '\n Arrival Time: ' +
    formatTime(order.arrivalTime) +
    '\n Service type: ' +
    order.serviceType?.name
  );
};

export const createTask = (
  worker: string,
  options: TaskOptions,
  performAt: any,
) => {
  return admin
    .firestore()
    .collection('tasks')
    .add({
      options: options,
      worker: worker,
      performAt: performAt,
      status: 'scheduled',
    })
    .catch((err) => console.log(err));
};

export const createAllTasks = async (
  orderRef: admin.firestore.DocumentReference,
  dateOfService: CustomDate,
  timeOfService: CustomTime,
  sendCustomerAt12: boolean,
  sendCustomerAt24: boolean,
  emailsAt12: string[],
  emailsAt24: string[],
) => {
  console.log('Creating tasks for order', orderRef.id);
  const serviceDate = moment.tz(
    [
      dateOfService.year,
      dateOfService.month - 1,
      dateOfService.day,
      timeOfService ? timeOfService.hour : 16,
      timeOfService ? timeOfService.minute : 0,
      0,
    ],
    'America/New_York',
  );

  const chargeDate = moment.tz(
    [dateOfService.year, dateOfService.month - 1, dateOfService.day, 8, 0, 0],
    'America/New_York',
  );

  return [
    createTask(
      'charge',
      {
        orderRef,
      },
      admin.firestore.Timestamp.fromDate(chargeDate.add(1, 'days').toDate()),
    ),
    createTask(
      'sms',
      {
        orderRef,
      },
      admin.firestore.Timestamp.fromDate(
        serviceDate.clone().subtract(30, 'minutes').toDate(),
      ),
    ),
  ];
};

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


