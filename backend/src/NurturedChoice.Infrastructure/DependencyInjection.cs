using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Infrastructure.Persistence;
using NurturedChoice.Infrastructure.Security;
using NurturedChoice.Infrastructure.Services;

namespace NurturedChoice.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration, bool useProductionSchema)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        services.AddSingleton(new DatabaseSchemaOptions(useProductionSchema));

        services.AddDbContext<SalesDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.EnableRetryOnFailure();
                npgsql.MigrationsHistoryTable("__ef_migrations", "public");
            });

        });

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<SalesDbContext>());
        services.AddScoped<IClock, SystemClock>();
        services.AddScoped<IPasswordHashService, PasswordHashService>();
        services.AddScoped<IParentGroupService, ParentGroupService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<ICompanyProfileService, CompanyProfileService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<ICreditNoteService, CreditNoteService>();
        services.AddScoped<IDeliveryNoteService, DeliveryNoteService>();
        services.AddScoped<IStatementService, StatementService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<ICollectionsService, CollectionsService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
