namespace NurturedChoice.Application.DTOs.Dashboard;

public sealed record DashboardSummaryDto(decimal TotalSales, decimal TodaySales, decimal MonthlySales, decimal AnnualSales, int TotalCustomers, int TotalParentGroups, int TotalBranches, int TotalProducts, decimal CurrentStockUnits, int LowStockAlerts, int TotalInvoices, int TotalStatements, int TotalCreditNotes, decimal OutstandingCustomerBalance);
public sealed record SalesTrendPointDto(string Label, decimal Sales);
public sealed record ProductPerformanceDto(string ProductName, decimal QuantitySold, decimal Revenue);
public sealed record CustomerRevenueDto(string CustomerName, decimal Revenue);
public sealed record RecentActivityItemDto(string Type, string Description, DateTime OccurredAt, string? Reference);
public sealed record DashboardPeriodDto(
    DateOnly StartDate,
    DateOnly EndDate,
    decimal Sales,
    decimal PreviousSales,
    decimal? SalesChangePercentage,
    int InvoiceCount,
    int PreviousInvoiceCount,
    decimal OutstandingBalance,
    IReadOnlyList<SalesTrendPointDto> Trend,
    IReadOnlyList<CustomerRevenueDto> TopCustomers);
