import type { ActivityItem, CustomerAccount, CustomerRow, ProductCatalogItem, ProductRow, StatCardData, InvoiceRow } from './types';

export const stats: StatCardData[] = [
  { label: 'Total Sales', value: 'KES 18.42M', delta: '+12.4%', accent: 'blue' },
  { label: "Today's Sales", value: 'KES 1.28M', delta: '+8.1%', accent: 'emerald' },
  { label: 'Monthly Sales', value: 'KES 4.76M', delta: '+15.8%', accent: 'amber' },
  { label: 'Outstanding Balance', value: 'KES 3.19M', delta: '-2.3%', accent: 'rose' }
];

export const activity: ActivityItem[] = [
  { title: 'Invoice INV-000482 finalized', detail: 'Nairobi Fresh Stores', time: '3 minutes ago' },
  { title: 'Low stock alert', detail: 'Quick Health Honey - 24 units remaining', time: '19 minutes ago' },
  { title: 'Statement generated', detail: 'Kisumu Wholesale Group', time: '1 hour ago' },
  { title: 'Credit note issued', detail: 'Sweetnut Roasted Nuts return adjustment', time: '2 hours ago' }
];

export const customers: CustomerRow[] = [
  { id: 'cust-1', name: 'Nairobi Fresh Stores Ltd', contact: 'Mercy Wanjiku', branches: 5, balance: 'KES 1.24M', status: 'Active' },
  { id: 'cust-2', name: 'Lake Basin Foods', contact: 'Samuel Otieno', branches: 3, balance: 'KES 682K', status: 'Active' },
  { id: 'cust-3', name: 'Coastline Retail Group', contact: 'Amina Hassan', branches: 4, balance: 'KES 909K', status: 'Credit Hold' },
  { id: 'cust-4', name: 'Upper Hill Pharmacies', contact: 'Kevin Muriuki', branches: 2, balance: 'KES 355K', status: 'Active' }
];

export const products: ProductRow[] = [
  { id: 'prod-1', sku: 'QHH-001', name: 'Quick Health Honey 500g', category: 'Honey', stock: '480', price: 'KES 850', status: 'Active' },
  { id: 'prod-2', sku: 'SNP-001', name: 'Sweetnut Peanut Butter 1kg', category: 'Peanut Butter', stock: '210', price: 'KES 1,150', status: 'Active' },
  { id: 'prod-3', sku: 'SNR-001', name: 'Sweetnut Roasted Nuts 250g', category: 'Roasted Nuts', stock: '92', price: 'KES 390', status: 'Low Stock' }
];

export const customerAccountsSeed: CustomerAccount[] = [
  {
    id: 'cust-1',
    companyName: 'Nairobi Fresh Stores Ltd',
    contactPerson: 'Mercy Wanjiku',
    email: 'mercy@nairobifresh.co.ke',
    phone: '+254700111222',
    address: 'Enterprise Road, Nairobi',
    kraPin: 'P051234567Q',
    creditLimit: 1500000,
    status: 'Active',
    branches: [
      { id: 'branch-1', branchName: 'Enterprise HQ', address: 'Enterprise Road, Nairobi', contactPerson: 'Mercy Wanjiku', email: 'hq@nairobifresh.co.ke', phone: '+254700111222' },
      { id: 'branch-2', branchName: 'Westlands Outlet', address: 'Westlands, Nairobi', contactPerson: 'John Kamau', email: 'westlands@nairobifresh.co.ke', phone: '+254700111223' }
    ]
  },
  {
    id: 'cust-2',
    companyName: 'Lake Basin Foods',
    contactPerson: 'Samuel Otieno',
    email: 'samuel@lakebasinfoods.co.ke',
    phone: '+254700333444',
    address: 'Kisumu CBD, Kisumu',
    kraPin: 'P098765432Q',
    creditLimit: 850000,
    status: 'Active',
    branches: [
      { id: 'branch-3', branchName: 'Kisumu Central', address: 'Kisumu CBD', contactPerson: 'Samuel Otieno', email: 'central@lakebasinfoods.co.ke', phone: '+254700333444' }
    ]
  }
];

export const productCatalogSeed: ProductCatalogItem[] = [
  {
    id: 'prod-1',
    sku: 'QHH-001',
    barcode: '890100000001',
    productName: 'Quick Health Honey 500g',
    category: 'Honey',
    description: 'Premium natural honey in a 500g jar.',
    buyingPrice: 620,
    sellingPrice: 850,
    unit: 'jar',
    currentStock: 480,
    minimumStock: 80,
    status: 'Active',
    imageUrl: ''
  },
  {
    id: 'prod-2',
    sku: 'SNP-001',
    barcode: '890100000002',
    productName: 'Sweetnut Peanut Butter 1kg',
    category: 'Peanut Butter',
    description: 'Smooth peanut butter for retail distribution.',
    buyingPrice: 850,
    sellingPrice: 1150,
    unit: 'jar',
    currentStock: 210,
    minimumStock: 60,
    status: 'Active',
    imageUrl: ''
  },
  {
    id: 'prod-3',
    sku: 'SNR-001',
    barcode: '890100000003',
    productName: 'Sweetnut Roasted Nuts 250g',
    category: 'Roasted Nuts',
    description: 'Salted roasted nuts in a 250g pouch.',
    buyingPrice: 270,
    sellingPrice: 390,
    unit: 'pouch',
    currentStock: 92,
    minimumStock: 120,
    status: 'Low Stock',
    imageUrl: ''
  }
];

export const invoicesSeed: InvoiceRow[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-000482',
    lpoNumber: 'LPO-8821',
    invoiceDate: '2026-07-17',
    parentGroupId: 'cust-1',
    branchId: 'branch-1',
    salesperson: 'Brian Mwangi',
    paymentTerms: '7 Days',
    dueDate: '2026-07-24',
    notes: 'Deliver in the morning.',
    status: 'Finalized',
    items: [
      { id: 'line-1', productId: 'prod-1', productName: 'Quick Health Honey 500g', quantity: 120, unitPrice: 850, discount: 0, tax: 0, lineTotal: 102000 }
    ],
    subtotal: 102000,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 102000
  }
];
