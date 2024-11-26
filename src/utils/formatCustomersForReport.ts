import { StatementData } from '../model';
import { sum } from './statements';


export const formatCustomersForReport = (array: StatementData[]) => {
  let customers: StatementData[] = [];
  let balance = 0;
  let paid = 0;
  let platformFee = 0;
  let grandTotal = 0;
  let salesTax = 0;
  if (array && array.length) {
    customers = array;
    balance = customers
      .map((customer) => +customer.data.balance)
      .reduce(sum, 0);
    paid = customers.map((customer) => +customer.data.paid).reduce(sum, 0);
    salesTax = customers
      .map((customer) => +customer.data.salesTax)
      .reduce(sum, 0);
    platformFee = customers
      .map((customer) => +customer.data.platformFee)
      .reduce(sum, 0);
    grandTotal = customers
      .map((customer) => +customer.data.grandTotal)
      .reduce(sum, 0);
  }
  return {
    customers: customers.sort((a, b) => {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    }),
    balance,
    paid,
    grandTotal,
    platformFee,
    salesTax,
  };
};