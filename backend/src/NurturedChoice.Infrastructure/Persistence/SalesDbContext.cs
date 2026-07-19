using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Domain.Entities.Catalog;
using NurturedChoice.Domain.Entities.Customers;
using NurturedChoice.Domain.Entities.Identity;
using NurturedChoice.Domain.Entities.Inventory;
using NurturedChoice.Domain.Entities.Settings;

namespace NurturedChoice.Infrastructure.Persistence;

public sealed class SalesDbContext : DbContext, IUnitOfWork
{
    private readonly IClock _clock;
    private readonly ICurrentUserService _currentUser;

    public SalesDbContext(DbContextOptions<SalesDbContext> options)
        : this(options, new SystemClock(), new NullCurrentUserService())
    {
    }

    public SalesDbContext(DbContextOptions<SalesDbContext> options, IClock clock, ICurrentUserService currentUser)
        : base(options)
    {
        _clock = clock;
        _currentUser = currentUser;
    }

    public DbSet<ParentGroup> ParentGroups => Set<ParentGroup>();

    public DbSet<Branch> Branches => Set<Branch>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    public DbSet<StockBalance> StockBalances => Set<StockBalance>();

    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();

    public DbSet<InvoiceNumberSettings> InvoiceNumberSettings => Set<InvoiceNumberSettings>();

    public DbSet<InvoiceNumberSequence> InvoiceNumberSequences => Set<InvoiceNumberSequence>();

    public DbSet<Invoice> Invoices => Set<Invoice>();

    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    public DbSet<Statement> Statements => Set<Statement>();

    public DbSet<StatementLine> StatementLines => Set<StatementLine>();

    public DbSet<CreditNote> CreditNotes => Set<CreditNote>();

    public DbSet<CreditNoteItem> CreditNoteItems => Set<CreditNoteItem>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();

    public DbSet<AppUser> AppUsers => Set<AppUser>();

    public DbSet<AppRole> AppRoles => Set<AppRole>();

    public DbSet<AppPermission> AppPermissions => Set<AppPermission>();

    public DbSet<AppUserRole> AppUserRoles => Set<AppUserRole>();

    public DbSet<AppRolePermission> AppRolePermissions => Set<AppRolePermission>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();

    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureParentGroups(modelBuilder.Entity<ParentGroup>());
        ConfigureBranches(modelBuilder.Entity<Branch>());
        ConfigureProducts(modelBuilder.Entity<Product>());
        ConfigureProductImages(modelBuilder.Entity<ProductImage>());
        ConfigureStockBalances(modelBuilder.Entity<StockBalance>());
        ConfigureStockMovements(modelBuilder.Entity<StockMovement>());
        ConfigureStockAdjustments(modelBuilder.Entity<StockAdjustment>());
        ConfigureInvoiceNumberSettings(modelBuilder.Entity<InvoiceNumberSettings>());
        ConfigureInvoiceNumberSequences(modelBuilder.Entity<InvoiceNumberSequence>());
        ConfigureInvoices(modelBuilder.Entity<Invoice>());
        ConfigureInvoiceItems(modelBuilder.Entity<InvoiceItem>());
        ConfigureStatements(modelBuilder.Entity<Statement>());
        ConfigureStatementLines(modelBuilder.Entity<StatementLine>());
        ConfigureCreditNotes(modelBuilder.Entity<CreditNote>());
        ConfigureCreditNoteItems(modelBuilder.Entity<CreditNoteItem>());
        ConfigurePayments(modelBuilder.Entity<Payment>());
        ConfigurePaymentAllocations(modelBuilder.Entity<PaymentAllocation>());
        ConfigureUsers(modelBuilder.Entity<AppUser>());
        ConfigureRoles(modelBuilder.Entity<AppRole>());
        ConfigurePermissions(modelBuilder.Entity<AppPermission>());
        ConfigureUserRoles(modelBuilder.Entity<AppUserRole>());
        ConfigureRolePermissions(modelBuilder.Entity<AppRolePermission>());
        ConfigureRefreshTokens(modelBuilder.Entity<RefreshToken>());
        ConfigureCompanyProfiles(modelBuilder.Entity<CompanyProfile>());
        ConfigureSystemSettings(modelBuilder.Entity<SystemSetting>());
    }

    public override int SaveChanges()
    {
        ApplyAuditInformation();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInformation();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditInformation()
    {
        var now = _clock.UtcNow;
        var userId = _currentUser.UserId;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = userId;
                continue;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = userId;
                continue;
            }

            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = now;
                entry.Entity.DeletedBy = userId;
            }
        }
    }

    private static void ConfigureAudited<TEntity>(EntityTypeBuilder<TEntity> builder, string tableName)
        where TEntity : AuditableEntity
    {
        builder.ToTable(tableName);
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RowVersion).IsRowVersion();
        builder.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
        builder.Property(x => x.DeletedAt).HasColumnType("timestamp with time zone");
        builder.HasQueryFilter(x => !x.IsDeleted);
    }

    private static void ConfigureParentGroups(EntityTypeBuilder<ParentGroup> builder)
    {
        ConfigureAudited(builder, "parent_groups");
        builder.Property(x => x.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ContactPerson).HasMaxLength(150);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.KraPin).HasMaxLength(50);
        builder.Property(x => x.CreditLimit).HasPrecision(18, 2);
        builder.HasIndex(x => x.CompanyName).IsUnique();
        builder.HasMany(x => x.Branches)
            .WithOne(x => x.ParentGroup)
            .HasForeignKey(x => x.ParentGroupId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureBranches(EntityTypeBuilder<Branch> builder)
    {
        ConfigureAudited(builder, "branches");
        builder.Property(x => x.BranchName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.ContactPerson).HasMaxLength(150);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.HasIndex(x => new { x.ParentGroupId, x.BranchName }).IsUnique();
    }

    private static void ConfigureProducts(EntityTypeBuilder<Product> builder)
    {
        ConfigureAudited(builder, "products");
        builder.Property(x => x.Sku).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Barcode).HasMaxLength(80);
        builder.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(120);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.Unit).HasMaxLength(40).IsRequired();
        builder.Property(x => x.BuyingPrice).HasPrecision(18, 2);
        builder.Property(x => x.SellingPrice).HasPrecision(18, 2);
        builder.Property(x => x.CurrentStock).HasPrecision(18, 3);
        builder.Property(x => x.MinimumStock).HasPrecision(18, 3);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.HasIndex(x => x.Sku).IsUnique();
        builder.HasIndex(x => x.Barcode).IsUnique();
    }

    private static void ConfigureProductImages(EntityTypeBuilder<ProductImage> builder)
    {
        ConfigureAudited(builder, "product_images");
        builder.Property(x => x.FileName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(500).IsRequired();
        builder.HasIndex(x => new { x.ProductId, x.IsPrimary });
    }

    private static void ConfigureStockBalances(EntityTypeBuilder<StockBalance> builder)
    {
        ConfigureAudited(builder, "stock_balances");
        builder.Property(x => x.QuantityOnHand).HasPrecision(18, 3);
        builder.Property(x => x.ReservedQuantity).HasPrecision(18, 3);
        builder.Property(x => x.LastReconciledAt).HasColumnType("timestamp with time zone");
        builder.HasIndex(x => new { x.ProductId, x.BranchId }).IsUnique();
    }

    private static void ConfigureStockMovements(EntityTypeBuilder<StockMovement> builder)
    {
        ConfigureAudited(builder, "stock_movements");
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.UnitCost).HasPrecision(18, 2);
        builder.Property(x => x.SourceDocumentType).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.HasIndex(x => new { x.ProductId, x.BranchId, x.CreatedAt });
    }

    private static void ConfigureStockAdjustments(EntityTypeBuilder<StockAdjustment> builder)
    {
        ConfigureAudited(builder, "stock_adjustments");
        builder.Property(x => x.PreviousQuantity).HasPrecision(18, 3);
        builder.Property(x => x.AdjustedQuantity).HasPrecision(18, 3);
        builder.Property(x => x.Reason).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.HasIndex(x => new { x.ProductId, x.BranchId, x.CreatedAt });
    }

    private static void ConfigureInvoiceNumberSettings(EntityTypeBuilder<InvoiceNumberSettings> builder)
    {
        ConfigureAudited(builder, "invoice_number_settings");
        builder.Property(x => x.Prefix).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Padding).IsRequired();
        builder.HasIndex(x => x.IsActive).HasDatabaseName("ix_invoice_number_settings_is_active");
    }

    private static void ConfigureInvoiceNumberSequences(EntityTypeBuilder<InvoiceNumberSequence> builder)
    {
        ConfigureAudited(builder, "invoice_number_sequences");
        builder.Property(x => x.SequenceKey).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.SequenceKey).IsUnique();
    }

    private static void ConfigureInvoices(EntityTypeBuilder<Invoice> builder)
    {
        ConfigureAudited(builder, "invoices");
        builder.Property(x => x.InvoiceNumber).HasMaxLength(40).IsRequired();
        builder.Property(x => x.LpoNumber).HasMaxLength(80);
        builder.Property(x => x.Salesperson).HasMaxLength(150);
        builder.Property(x => x.PaymentTerms).HasMaxLength(200);
        builder.Property(x => x.DiscountTotal).HasPrecision(18, 2);
        builder.Property(x => x.TaxTotal).HasPrecision(18, 2);
        builder.Property(x => x.Subtotal).HasPrecision(18, 2);
        builder.Property(x => x.GrandTotal).HasPrecision(18, 2);
        builder.Property(x => x.Notes).HasMaxLength(2000);
        builder.HasIndex(x => x.InvoiceNumber).IsUnique();
        builder.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureInvoiceItems(EntityTypeBuilder<InvoiceItem> builder)
    {
        ConfigureAudited(builder, "invoice_items");
        builder.Property(x => x.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.ItemDescription).HasMaxLength(1000);
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.Discount).HasPrecision(18, 2);
        builder.Property(x => x.Tax).HasPrecision(18, 2);
        builder.Property(x => x.LineTotal).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.InvoiceId, x.ProductId });
    }

    private static void ConfigureStatements(EntityTypeBuilder<Statement> builder)
    {
        ConfigureAudited(builder, "statements");
        builder.Property(x => x.StatementNumber).HasMaxLength(40).IsRequired();
        builder.Property(x => x.OpeningBalance).HasPrecision(18, 2);
        builder.Property(x => x.ClosingBalance).HasPrecision(18, 2);
        builder.HasIndex(x => x.StatementNumber).IsUnique();
        builder.HasMany(x => x.Lines)
            .WithOne()
            .HasForeignKey(x => x.StatementId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureStatementLines(EntityTypeBuilder<StatementLine> builder)
    {
        ConfigureAudited(builder, "statement_lines");
        builder.Property(x => x.Description).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Debit).HasPrecision(18, 2);
        builder.Property(x => x.Credit).HasPrecision(18, 2);
        builder.Property(x => x.Balance).HasPrecision(18, 2);
        builder.Property(x => x.SourceDocumentType).HasMaxLength(100);
        builder.HasIndex(x => new { x.StatementId, x.TransactionDate });
    }

    private static void ConfigureCreditNotes(EntityTypeBuilder<CreditNote> builder)
    {
        ConfigureAudited(builder, "credit_notes");
        builder.Property(x => x.CreditNoteNumber).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(1000);
        builder.Property(x => x.TotalAmount).HasPrecision(18, 2);
        builder.HasIndex(x => x.CreditNoteNumber).IsUnique();
        builder.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(x => x.CreditNoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureCreditNoteItems(EntityTypeBuilder<CreditNoteItem> builder)
    {
        ConfigureAudited(builder, "credit_note_items");
        builder.Property(x => x.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.Property(x => x.UnitPrice).HasPrecision(18, 2);
        builder.Property(x => x.LineTotal).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.CreditNoteId, x.ProductId });
    }

    private static void ConfigurePayments(EntityTypeBuilder<Payment> builder)
    {
        ConfigureAudited(builder, "payments");
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Method).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Reference).HasMaxLength(120);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.HasMany(x => x.Allocations)
            .WithOne()
            .HasForeignKey(x => x.PaymentId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigurePaymentAllocations(EntityTypeBuilder<PaymentAllocation> builder)
    {
        ConfigureAudited(builder, "payment_allocations");
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.PaymentId, x.InvoiceId, x.StatementId });
    }

    private static void ConfigureUsers(EntityTypeBuilder<AppUser> builder)
    {
        ConfigureAudited(builder, "app_users");
        builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.PhoneNumber).HasMaxLength(50);
        builder.Property(x => x.GoogleSubject).HasMaxLength(150);
        builder.Property(x => x.PasswordHash).HasMaxLength(500);
        builder.HasIndex(x => x.Email).IsUnique();
    }

    private static void ConfigureRoles(EntityTypeBuilder<AppRole> builder)
    {
        ConfigureAudited(builder, "app_roles");
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.HasIndex(x => x.Name).IsUnique();
    }

    private static void ConfigurePermissions(EntityTypeBuilder<AppPermission> builder)
    {
        ConfigureAudited(builder, "app_permissions");
        builder.Property(x => x.Key).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.HasIndex(x => x.Key).IsUnique();
    }

    private static void ConfigureUserRoles(EntityTypeBuilder<AppUserRole> builder)
    {
        ConfigureAudited(builder, "app_user_roles");
        builder.HasIndex(x => new { x.AppUserId, x.AppRoleId }).IsUnique();
    }

    private static void ConfigureRolePermissions(EntityTypeBuilder<AppRolePermission> builder)
    {
        ConfigureAudited(builder, "app_role_permissions");
        builder.HasIndex(x => new { x.AppRoleId, x.AppPermissionId }).IsUnique();
    }

    private static void ConfigureRefreshTokens(EntityTypeBuilder<RefreshToken> builder)
    {
        ConfigureAudited(builder, "refresh_tokens");
        builder.Property(x => x.Token).HasMaxLength(500).IsRequired();
        builder.Property(x => x.ReplacedByToken).HasMaxLength(500);
        builder.Property(x => x.CreatedByIp).HasMaxLength(100);
        builder.Property(x => x.RevokedByIp).HasMaxLength(100);
        builder.HasIndex(x => x.Token).IsUnique();
    }

    private static void ConfigureCompanyProfiles(EntityTypeBuilder<CompanyProfile> builder)
    {
        ConfigureAudited(builder, "company_profiles");
        builder.Property(x => x.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.LogoUrl).HasMaxLength(500);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.Country).HasMaxLength(100);
        builder.Property(x => x.CurrencyCode).HasMaxLength(10);
    }

    private static void ConfigureSystemSettings(EntityTypeBuilder<SystemSetting> builder)
    {
        ConfigureAudited(builder, "system_settings");
        builder.Property(x => x.SettingKey).HasMaxLength(150).IsRequired();
        builder.Property(x => x.SettingValue).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.HasIndex(x => x.SettingKey).IsUnique();
    }

    private sealed class NullCurrentUserService : ICurrentUserService
    {
        public Guid? UserId => null;

        public string? Email => null;

        public string? DisplayName => null;

        public bool IsAuthenticated => false;
    }
}
