import { firestore } from 'firebase-admin';

export interface Staff {
  cellPhone: string;
  email: string;
  enableSurvey?: boolean;
  id?: string;
  isDeleted?: boolean;
  name: string;
  ref?: firestore.DocumentReference;
  retailerRef?: firestore.DocumentReference;
  updates?: {
    subscribed: boolean;
    notification: 'sms' | 'email' | 'both';
  };
}

export interface Updates {
  id?: string;
  disabledDates?: string[];
  generalAnnouncements?: string[];
}

interface NewOrderNotification {
    emailFuneralDirector: boolean;
    emailFuneralHomeAccounts: boolean;
    emailRetailer: boolean;
    remotePrint: boolean;
    textRetailer: boolean;
}

interface ConfirmedOrderNotification {
    emailFuneralDirector: boolean;
    emailFuneralHomeAccounts: boolean;
}

interface AssignedOrderNotification {
    textFuneralDirector: boolean;
    textVaultSettler: boolean;
    textRetailer: boolean;
}

interface ReminderNotification {
    emailCustomer: boolean;
    emailRetailer: boolean;
}

interface DeliveredOrderNotification {
    textFuneralDirector: boolean;
    textRetailer: boolean;
}

interface NonDeliveredOrderNotification {
    textVaultSettler: boolean,
    textFuneralDirector: boolean;
    textRetailer: boolean;
}

interface GeneralInformation {
    retailerPhoneNumbers: string[];
    retailerEmails: string[];
    faxNumbers: string[];
}

interface SurveysNotification {
    sendSurvey: boolean;
    sendSurveyResults: {
        email: boolean;
        sms: boolean;
    }
}

interface StockNotification {
  sms: boolean;
  email: boolean;
}

export interface Notifications {
  id: string;
  newOrders: NewOrderNotification;
  confirmedOrders: ConfirmedOrderNotification;
  assignedOrders: AssignedOrderNotification;
  twentyFourHourNotification: ReminderNotification;
  twelveHourNotification: ReminderNotification;
  deliveredOrders: DeliveredOrderNotification;
  nonDeliveredOrders: NonDeliveredOrderNotification;
  generalInformation: GeneralInformation;
  surveys: SurveysNotification;
  stock: StockNotification;
}

export interface TaskOptions {
    orderRef?: firestore.DocumentReference;
    subjectPrefix?: string;
    sendFuneralDirector?: boolean;
    sendFuneralHome?: boolean;
    heading?: string;
    emails?: string[];
    cellPhones?: string[];
    date?: string;
    email?: string;
    retailerId?: string,
    customerId?: string,
    contactType?: string;
}

export interface Task {
    options: TaskOptions;
    worker: string;
    performAt: firestore.Timestamp;
    status: 'complete' | 'scheduled' | 'error';
}

export interface Option {
    name: 'Holiday' | 'Saturday' | 'Sunday' | 'Platform Fee' | 'On Account Fee' | 'ACH Fee' | 'Credit Card Fee';
    price: number;
    image?: string;
    category?: string;
    qty?: number;
    quantity?: number;
    notification?: {
      minimum: number;
      maximum: number;
    };
}

export interface Order {
  applyPlatformFee: boolean;
  arrivalTime?: CustomTime;
  birthDate?: CustomDate;
  cellPhone?: string;
  cemetery?: string;
  charge?: any;
  contact?: string;
  comments?: string;
  confirmed?: boolean;
  smsSent?: boolean;
  createdAt: firestore.Timestamp;
  customerRef?: firestore.DocumentReference;
  dateOfService: CustomDate;
  delivered?: boolean;
  deathDate?: CustomDate;
  deliveryInstructions?: string;
  directorRef?: firestore.DocumentReference;
  discount?: number;
  salesTax?: number;
  email?: string;
  emblem?: string;
  extraCharges?: Option[];
  id?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  charged?: boolean;
  isParent?: boolean;
  items?: Option[];
  location?: string;
  name?: string;
  oldVersionRef?: firestore.DocumentReference;
  productOptions?: Option;
  productPaintColorOptions?: string;
  retailerRef?: firestore.DocumentReference;
  serviceExtras?: Option[];
  serviceType?: Option;
  staffRef?: firestore.DocumentReference;
  storeLocation?: Location;
  timeOfService?: CustomTime;
  updatedAt: firestore.Timestamp;
}

// Main data interface
export interface Product {
  attachment: firestore.DocumentReference;
  createAt: Date;
  current: boolean;
  id: string;
  isDeleted: boolean;
  name: string;
  notification: {
    maximum: number;
    minimum: number;
  }
  quantity: number;
  retailerRef: firestore.DocumentReference;
  updatedAt: Date;
}

export interface Statement {
    retailerRef?: firestore.DocumentReference;
    customerRef?: firestore.DocumentReference;
    date: string;
    path: string;
}

export interface CustomDate {
    year: number;
    month: number;
    day: number;
}

export interface CustomTime {
    hour: number;
    minute: number;
    second: number;
}

interface Location {
    name: string;
    address?: string;
}

interface SurveySettings {
  disabled: boolean;
  text: boolean;
  email: boolean;
}

export interface Customer {
    statements?: [Statement]
    id?: string;
    ref?: firestore.DocumentReference;
    retailerRef?: firestore.DocumentReference;
    retailer?: Retailer;
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    discount?: number;
    salesTax?: number;
    hidePrice?: boolean;
    source?: string;
    client_secret?: string;
    btok?: string;
    ba?: string;
    last4?: string;
    bankName?: string;
    verified?: boolean;
    stripeCustomerId?: string;
    paymentMethod?: string;
    hasMultipleLocations?: boolean;
    locations?: Location[];
    surveySettings: SurveySettings;
}

export interface AdditionalCharges {
    creditCardFee: number;
    achFee: number;
    onAccountFee: number;
}

export interface PlatformFee {
    customer: boolean;
    amount: number;
}

export interface CalendarOptions {
    saturdayCharge: number;
    sundayCharge: number;
    holidayCharge: number;
}

export interface address {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
}

export interface HolidayOptions {
    name: string;
    enabled: boolean;
}

interface Holiday {
    active: boolean;
    holidayDate: string;
    holidayName: string;
}

export interface Retailer {
  additionalCharges?: AdditionalCharges;
  address?: address;
  ba?: string;
  bankName?: string;
  btok?: string;
  calendarOptions?: CalendarOptions;
  cellPhone: string;
  client_secret?: string;
  disabledDates: string[];
  email: string;
  fax: string;
  holidayOptions?: Holiday[];
  holidaySettings?: [HolidayOptions];
  id?: string;
  last4?: string;
  logo?: string;
  name: string;
  paymentFrequency: 'daily' | 'monthly';
  pendingCharge?: number;
  platformFee?: PlatformFee;
  productOptions?: [Option];
  ref: firestore.DocumentReference;
  serviceExtras?: [Option];
  serviceType?: [Option];
  source?: string;
  statements?: [Statement];
  stripeAccount?: string;
  stripeCustomerId?: string;
  verified?: boolean;
}

export interface FirebaseConfig {
    vaultWrx: {
        appUrl: string;
        domain: string;
    };
    twillio: TwillioConfig;
    stripeApiKey: string;
    sendgridApiKey: string;
    ringCentral: RingCentralConfig;
}

export interface TwillioConfig {
    number: string;
    accountSid: string;
    authToken: string;
}

export interface RingCentralConfig {
    serverUrl: string,
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
}

export interface PDFData {
    subject?: string;
    heading: string;
    id: string;
    contact: string;
    email: string;
    cellPhone: string;
    name?: string;
    dateOfService: string;
    arrivalTime?: string;
    timeOfService?: string;
    birthYear?: string;
    cemetery?: string;
    deathYear?: string;
    location?: string;
    productPaintColorOptions?: string;
    emblem?: string;
    productOptions?: Option;
    serviceExtras?: Option[];
    extraCharges?: Option[];
    serviceType?: Option;
    comments: string;
    retailer: boolean;
    showConfirm: boolean;
    customerName: string;
    retailerFax: string;
    showPrice: boolean;
    bulk?: boolean;
    salesTax: number;
    items?: Option[]
}

export interface Workers {
    [key: string]: (options: any) => Promise<any>
}

export interface OrderStatement {
    delivery?: string;
    customer?: string;
    description?: string;
    url?: string;
    vault?: Option | Boolean;
    items?: Option[] | Boolean;
    rowspan?: number;
    price?: number;
    paid?: number;
    salesTax: number;
    balance?: number;
    grandTotal?: number;
    platformFee?: number;
    orders?: OrderStatement[];
    customers?: StatementData[];
}

export interface StatementData {
    name: string;
    email?: string;
    month?: string;
    duedate?: string;
    data: OrderStatement;
    retailer?: Retailer;
    timestamp: string;
    location?: Location;
    customerRef?: firestore.DocumentReference;
    retailerRef?: firestore.DocumentReference;
}

export interface Log {
    id?: string;
    action: string;
    orderRef?: firestore.DocumentReference;
    customerRef?: firestore.DocumentReference;
    retailerRef?: firestore.DocumentReference;
    timestamp: firestore.Timestamp;
}

export interface Survey {
    processed: any;
    id: string;
    responded: boolean;
    orderRef: firestore.DocumentReference;
    retailerRef: firestore.DocumentReference;
    staffRef: firestore.DocumentReference;
    formId: string;
    createdAt: firestore.Timestamp;
    responses: {
        question: string;
        response: string;
    }[];
    questions: {
        questionId: string;
        question: string;
    }[];
}

export interface DetailedInvoice {
  detailedInvoices: Statement[];
}
