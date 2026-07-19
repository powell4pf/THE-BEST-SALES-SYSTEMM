import { useState } from 'react';
import { BarChart2, ShoppingBag, FileText } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AccountsReceivableAgingReport } from '../components/reports/AccountsReceivableAgingReport';

type ReportKey = 'accountsReceivableAging' | 'salesByCustomer' | 'salesByProduct';

const reports = [
  {
    category: 'Sales Reports',
    icon: BarChart2,
    items: [
      { key: 'salesByCustomer', title: 'Sales by Customer', description: 'Analyze revenue generated from each customer.' },
      { key: 'salesByProduct', title: 'Sales by Product', description: 'Identify top-performing products and sales trends.' },
      { key: 'salesBySalesperson', title: 'Sales by Salesperson', description: 'Track performance of individual sales team members.' }
    ]
  },
  {
    category: 'Inventory Reports',
    icon: ShoppingBag,
    items: [
      { key: 'inventoryValuation', title: 'Inventory Valuation', description: 'Get the total value of your current stock on hand.' },
      { key: 'stockMovementHistory', title: 'Stock Movement History', description: 'Audit the trail of every item in your inventory.' },
      { key: 'inventoryAging', title: 'Inventory Aging', description: 'Identify slow-moving or obsolete stock.' }
    ]
  },
  {
    category: 'Financial Reports',
    icon: FileText,
    items: [
      { key: 'accountsReceivableAging', title: 'Accounts Receivable Aging', description: 'View outstanding customer balances by age.' },
      { key: 'paymentHistory', title: 'Payment History', description: 'Track all payments received from customers.' }
    ]
  }
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  if (activeReport === 'accountsReceivableAging') {
    return <AccountsReceivableAgingReport onBack={() => setActiveReport(null)} />;
  }

  return (
    <div className="space-y-8">
      {reports.map((group) => (
        <section key={group.category}>
          <div className="mb-4 flex items-center gap-3">
            <group.icon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{group.category}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((report) => (
              <Card key={report.title} className="flex flex-col justify-between p-6">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">{report.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{report.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 w-full"
                  disabled={report.key !== 'accountsReceivableAging'}
                  onClick={() => setActiveReport(report.key as ReportKey)}
                >
                  View Report
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
