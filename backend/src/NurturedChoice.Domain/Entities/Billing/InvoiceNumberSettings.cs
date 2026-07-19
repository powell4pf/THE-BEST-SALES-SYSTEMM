using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Billing;

public class InvoiceNumberSettings : AuditableEntity
{
    public string Prefix { get; set; } = "INV";

    public long StartingNumber { get; set; } = 1;

    public int Padding { get; set; } = 6;

    public NumberResetPolicy ResetPolicy { get; set; } = NumberResetPolicy.Yearly;

    public bool ManualEditingAllowed { get; set; } = true;

    public bool IsActive { get; set; } = true;
}

