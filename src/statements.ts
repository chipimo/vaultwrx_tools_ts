import { generateAdminStatements } from "./GenerateAdminStatements";
import { generateCustomerStatements } from "./GenerateCustomerStatements";
import { generateRetailerStatements } from "./GenerateRetailerStatements";

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

  if (admin) {
    await generateAdminStatements(date).catch((error: any) => {
      console.log(error);
    });
  }
  if (customer) {
    await generateCustomerStatements(date, customerId).catch((error: any) => {
      console.log(error);
    });
  }
  if (retailer) {
    await generateRetailerStatements(date, retailerId).catch((error: any) => {
      console.log(error);
    });
  }
};


