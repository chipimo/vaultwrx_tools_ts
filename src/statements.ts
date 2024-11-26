import { generateAdminStatements, generateCustomerStatements, generateRetailerStatements } from './utils/statements';

import cron from 'node-cron';

interface StatementProps {
  roles: {
    admin: boolean;
    customer: boolean;
    retailer: boolean;
    customerId: string;
    retailerId: string;
  };
  date: Date;
}

/**
 * Generates statements based on the provided date and roles.
 *
 * @param {StatementProps} props - The properties required to generate statements.
 * @param {Date} props.date - The date for which statements are to be generated.
 * @param {Object} props.roles - The roles for which statements are to be generated.
 * @param {boolean} props.roles.admin - Indicates if admin statements should be generated.
 * @param {boolean} props.roles.customer - Indicates if customer statements should be generated.
 * @param {string} props.roles.customerId - The ID of the customer for whom statements should be generated.
 * @param {boolean} props.roles.retailer - Indicates if retailer statements should be generated.
 * @param {string} props.roles.retailerId - The ID of the retailer for whom statements should be generated.
 *
 * @returns {Promise<Object>} A promise that resolves to an object containing either a success message or an error message.
 */
export const onRequestGenerateStatements = async (props: StatementProps) => {
  const { date, roles } = props;

  if (!date || !roles) {
    return { error: "Fields 'date' and 'roles' are required" };
  }

  if (roles.admin) {
    await generateAdminStatements(date).catch((error) => {
      console.log(error);
      return { error: error };
    });
  }
  
  if (roles.customer) {
    await generateCustomerStatements(date, roles.customerId).catch(
      (error) => {
        console.log('customer error', error);
        return { error: error };
      },
    );
  }

  if (roles.retailer) {
    await generateRetailerStatements(date, roles.retailerId).catch(
      (error) => {
        console.log('retailer error', error);
        return { error: error };
      },
    );
  }

  console.log('Invoices generated successfully');
  return { message: 'Invoices generated successfully' };
};

/**
 * Generates all statements for different roles sequentially.
 * 
 * This function defines a list of roles and processes each role one by one
 * by calling the `onRequestGenerateStatements` function with the current date
 * and the role being processed. If any error occurs during the processing,
 * it logs the error to the console.
 * 
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when all statements have been processed.
 * 
 * @example
 * generateAllStatements()
 *   .then(() => console.log('Statements generated successfully'))
 *   .catch((error) => console.error('Error generating statements:', error));
 */
export const generateAllStatements = async () => {
  const date = new Date();

  // Define roles for sequential execution
  const rolesList: StatementProps['roles'][] = [
    { admin: true, customer: false, retailer: false, customerId: '', retailerId: '' },
    { admin: false, customer: true, retailer: false, customerId: 'customer123', retailerId: '' },
    { admin: false, customer: false, retailer: true, customerId: '', retailerId: 'retailer123' },
  ];

  try {
    // Process each role sequentially
    for (const roles of rolesList) {
      console.log(`Processing statements for roles: ${JSON.stringify(roles)}`);
      await onRequestGenerateStatements({ date, roles });
    }
    console.log('All statements processed successfully');
  } catch (error) {
    console.error('Error generating statements:', error);
  }
};

// Schedule job for 7:00 PM in the "America/New_York" timezone
cron.schedule(
  '0 19 * * *',
  () => {
    console.log('Daily 7:00 PM Job running in America/New_York timezone');
    generateAllStatements();
  },
  {
    timezone: 'America/New_York',
  },
);

// Schedule job for 10:00 AM in the "America/New_York" timezone
cron.schedule(
  '0 10 * * *',
  () => {
    console.log('Daily 10:00 AM Job running in America/New_York timezone');
    generateAllStatements();
  },
  {
    timezone: 'America/New_York',
  },
);