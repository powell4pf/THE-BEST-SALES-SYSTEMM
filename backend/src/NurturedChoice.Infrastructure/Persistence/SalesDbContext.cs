using Microsoft.EntityFrameworkCore;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Domain.Entities.Catalog;
using NurturedChoice.Domain.Entities.Customers;
using NurturedChoice.Domain.Entities.Identity;
using NurturedChoice.Domain.Entities.Inventory;
using NurturedChoice.Domain.Entities.Settings;
using NurturedChoice.Application.Abstractions;

namespace NurturedChoice.Infrastructure.Persistence;

public class SalesDbContext : DbContext, IUnitOfWork
{
    private readonly bool _useSnakeCase;

    public SalesDbContext(DbContextOptions<SalesDbContext> options, DatabaseSchemaOptions? schemaOptions = null) : base(options)
    {
        _useSnakeCase = schemaOptions?.UseSnakeCase == true;
    }

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<InvoiceNumberSettings> InvoiceNumberSettings => Set<InvoiceNumberSettings>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ParentGroup> ParentGroups => Set<ParentGroup>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();
    public DbSet<CollectionFollowUp> CollectionFollowUps => Set<CollectionFollowUp>();
    public DbSet<CreditNote> CreditNotes => Set<CreditNote>();
    public DbSet<CreditNoteItem> CreditNoteItems => Set<CreditNoteItem>();
    public DbSet<DeliveryNote> DeliveryNotes => Set<DeliveryNote>();
    public DbSet<DeliveryNoteItem> DeliveryNoteItems => Set<DeliveryNoteItem>();
    public DbSet<Statement> Statements => Set<Statement>();
    public DbSet<StatementLine> StatementLines => Set<StatementLine>();
    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<MonthEndReminder> MonthEndReminders => Set<MonthEndReminder>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<AppRole> AppRoles => Set<AppRole>();
    public DbSet<AppPermission> AppPermissions => Set<AppPermission>();
    public DbSet<AppUserRole> AppUserRoles => Set<AppUserRole>();
    public DbSet<AppRolePermission> AppRolePermissions => Set<AppRolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<StockBalance> StockBalances => Set<StockBalance>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Invoice>().ToTable("invoices");
        modelBuilder.Entity<InvoiceItem>().ToTable("invoice_items");
        // Discount and tax columns were intentionally removed from invoice
        // items. Keep the legacy CLR properties for compatibility with old
        // DTOs, but never read or write them through EF.
        modelBuilder.Entity<InvoiceItem>().Ignore(x => x.Discount);
        modelBuilder.Entity<InvoiceItem>().Ignore(x => x.Tax);
        modelBuilder.Entity<InvoiceNumberSettings>().ToTable("invoice_number_settings");
        modelBuilder.Entity<Product>().ToTable("products");
        modelBuilder.Entity<ParentGroup>().ToTable("parent_groups");
        modelBuilder.Entity<Branch>().ToTable("branches");
        modelBuilder.Entity<Payment>().ToTable("payments");
        modelBuilder.Entity<PaymentAllocation>().ToTable("payment_allocations");
        modelBuilder.Entity<CollectionFollowUp>().ToTable("collection_follow_ups");
        modelBuilder.Entity<CreditNote>().ToTable("credit_notes");
        modelBuilder.Entity<CreditNoteItem>().ToTable("credit_note_items");
        modelBuilder.Entity<DeliveryNote>().ToTable("delivery_notes");
        modelBuilder.Entity<DeliveryNoteItem>().ToTable("delivery_note_items");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.Id).HasColumnName("id");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.DeliveryNoteNumber).HasColumnName("delivery_note_number");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.ParentGroupId).HasColumnName("parent_group_id");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.BranchId).HasColumnName("branch_id");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.DeliveryDate).HasColumnName("delivery_date");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.Notes).HasColumnName("notes");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.Status).HasColumnName("status");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.Id).HasColumnName("id");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.DeliveryNoteId).HasColumnName("delivery_note_id");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.ProductId).HasColumnName("product_id");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.ItemName).HasColumnName("item_name");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.Quantity).HasColumnName("quantity");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.CreatedAt).HasColumnName("created_at");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.CreatedBy).HasColumnName("created_by");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.UpdatedAt).HasColumnName("updated_at");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.UpdatedBy).HasColumnName("updated_by");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.IsDeleted).HasColumnName("is_deleted");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.DeletedAt).HasColumnName("deleted_at");
        modelBuilder.Entity<DeliveryNote>().Property(x => x.DeletedBy).HasColumnName("deleted_by");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.CreatedAt).HasColumnName("created_at");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.CreatedBy).HasColumnName("created_by");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.UpdatedAt).HasColumnName("updated_at");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.UpdatedBy).HasColumnName("updated_by");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.IsDeleted).HasColumnName("is_deleted");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.DeletedAt).HasColumnName("deleted_at");
        modelBuilder.Entity<DeliveryNoteItem>().Property(x => x.DeletedBy).HasColumnName("deleted_by");
        modelBuilder.Entity<Statement>().ToTable("statements");
        modelBuilder.Entity<StatementLine>().ToTable("statement_lines");
        modelBuilder.Entity<CompanyProfile>().ToTable("company_profiles");
        modelBuilder.Entity<SystemSetting>().ToTable("system_settings");
        modelBuilder.Entity<MonthEndReminder>().ToTable("month_end_reminders");
        modelBuilder.Entity<AppUser>().ToTable("app_users");
        modelBuilder.Entity<AppRole>().ToTable("app_roles");
        modelBuilder.Entity<AppPermission>().ToTable("app_permissions");
        modelBuilder.Entity<AppUserRole>().ToTable("app_user_roles");
        modelBuilder.Entity<AppRolePermission>().ToTable("app_role_permissions");
        modelBuilder.Entity<RefreshToken>().ToTable("refresh_tokens");
        modelBuilder.Entity<StockBalance>().ToTable("stock_balances");
        modelBuilder.Entity<StockMovement>().ToTable("stock_movements");
        modelBuilder.Entity<StockAdjustment>().ToTable("stock_adjustments");

        modelBuilder.Entity<MonthEndReminder>().HasIndex(x => new { x.AppUserId, x.PeriodKey }).IsUnique();
        modelBuilder.Entity<MonthEndReminder>().Property(x => x.PeriodKey).HasMaxLength(7);
        modelBuilder.Entity<MonthEndReminder>().Property(x => x.Title).HasMaxLength(160);
        modelBuilder.Entity<MonthEndReminder>().Property(x => x.Message).HasMaxLength(1000);

        // Follow-ups are the one new table created by the SQL migration and
        // therefore intentionally use its snake_case column names. The
        // existing business tables retain their historical EF column names.
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.Id).HasColumnName("id");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.ParentGroupId).HasColumnName("parent_group_id");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.Status).HasColumnName("status");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.NextFollowUpDate).HasColumnName("next_follow_up_date");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.LastContactedAt).HasColumnName("last_contacted_at");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.LastContactMethod).HasColumnName("last_contact_method");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.Notes).HasColumnName("notes");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.CreatedAt).HasColumnName("created_at");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.CreatedBy).HasColumnName("created_by");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.UpdatedAt).HasColumnName("updated_at");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.UpdatedBy).HasColumnName("updated_by");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.IsDeleted).HasColumnName("is_deleted");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.DeletedAt).HasColumnName("deleted_at");
        modelBuilder.Entity<CollectionFollowUp>().Property(x => x.DeletedBy).HasColumnName("deleted_by");

        if (_useSnakeCase)
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    property.SetColumnName(ToSnakeCase(property.Name));
                }
            }
        }
    }

    private static string ToSnakeCase(string value)
    {
        if (string.IsNullOrEmpty(value)) return value;
        var result = new System.Text.StringBuilder(value.Length + 8);
        for (var index = 0; index < value.Length; index++)
        {
            var character = value[index];
            if (char.IsUpper(character))
            {
                var previousIsLower = index > 0 && char.IsLower(value[index - 1]);
                var previousIsUpper = index > 0 && char.IsUpper(value[index - 1]);
                var nextIsLower = index + 1 < value.Length && char.IsLower(value[index + 1]);
                if (index > 0 && (previousIsLower || (previousIsUpper && nextIsLower))) result.Append('_');
                result.Append(char.ToLowerInvariant(character));
            }
            else result.Append(character);
        }
        return result.ToString();
    }

}
