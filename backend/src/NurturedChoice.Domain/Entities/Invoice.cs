using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities;

public class Invoice : AuditableEntity
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? LpoNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public Guid ParentGroupId { get; set; }
    public Guid BranchId { get; set; }
    public string? Salesperson { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Notes { get; set; }
    public InvoiceStatus Status { get; set; }

    // Navigation property
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();

    // Assuming these are calculated or stored for summary
    public decimal Subtotal { get; set; }
    public decimal GrandTotal { get; set; }

    // Placeholder for ParentGroup and Branch navigation properties
    // public ParentGroup ParentGroup { get; set; } = null!;
    // public Branch Branch { get; set; } = null!;
}