namespace NurturedChoice.Application.DTOs.Reports;

public sealed record AccountsReceivableAgingDto(IReadOnlyList<AccountsReceivableAgingItemDto> Items);

public sealed record AccountsReceivableAgingItemDto(Guid CustomerId, string CustomerName, decimal Current, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Days91Plus, decimal Total);
