using System.ComponentModel.DataAnnotations.Schema;

namespace NurturedChoice.Domain.Entities;

public class InvoiceItem : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ItemName { get; set; } = string.Empty; // Denormalized product name
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    [NotMapped]
    public decimal LineTotal => Quantity * UnitPrice;

    // The base class 'AuditableEntity' would contain:
    // CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, IsDeleted, DeletedAt, DeletedBy
}