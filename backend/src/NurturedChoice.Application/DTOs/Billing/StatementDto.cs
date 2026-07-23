namespace NurturedChoice.Application.DTOs.Billing;

public sealed record StatementDto(string CustomerName, DateOnly StartDate, DateOnly EndDate, decimal OpeningBalance, decimal ClosingBalance, IReadOnlyList<StatementTransactionDto> Transactions);

public sealed record StatementTransactionDto(DateOnly Date, string Document, string Description, decimal Debit, decimal Credit, decimal Balance);
