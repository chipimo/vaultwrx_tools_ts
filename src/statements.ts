// import { generateAdminStatements } from './GenerateAdminStatements';
// import { generateAdminInvoices } from './generatePDFInvoices';
// import { generateCustomerStatements } from './GenerateCustomerStatements';
// import { generateRetailerStatements } from './GenerateRetailerStatements';

import { generateAdminStatements } from './utils/statements';

interface StatementProps {
  admin: boolean;
  customer: boolean;
  retailer: boolean;
  customerId: string;
  retailerId: string;
  date: Date;
}

export const onRequestGenerateStatements = async (props: StatementProps) => {
  const { date, admin, customer, retailer, customerId, retailerId } = props;

  const roles: {
    admin: boolean;
    customer: boolean;
    retailer: boolean;
  } = { admin, customer, retailer };
  if (!date || !roles) {
    return ({ error: "Fields 'date' and 'roles' are required" });
  }
  if (roles.admin) {
    await generateAdminStatements(date).catch((error) => {
      console.log(error);
      return ({ error: error });
    });
  }
  // if (roles.customer) {
  //   await generateCustomerStatements(date, customerId).catch(
  //     (error: any) => {
  //       console.log(error);
  //       return ({ error });
  //     },
  //   );
  // }
  // if (roles.retailer) {
  //   await generateRetailerStatements(date, retailerId).catch(
  //     (error: any) => {
  //       console.log(error);
  //       return ({ error });
  //     },
  //   );
  // }
  console.log('Invoices generated successfully');
  
  return ({ message: 'Invoices generated successfully' });
};
