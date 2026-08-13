using NurturedChoice.Application.DTOs.Reports;

namespace NurturedChoice.Application.Abstractions;

public interface IReportsService
{
    Task<AccountsReceivableAgingDto> GetAccountsReceivableAgingAsync(CancellationToken cancellationToken = default);
    Task<ReportTableDto> GetReportAsync(string reportKey, CancellationToken cancellationToken = default);
}
