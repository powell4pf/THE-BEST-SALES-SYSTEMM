using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Domain.Entities.Identity;
using NurturedChoice.Domain.Entities.Settings;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Infrastructure.Persistence;

public static class ReferenceDataSeeder
{
    private static readonly (string Key, string Name, string? Description)[] Permissions =
    [
        ("customers.view", "View Customers", "Can view parent groups and branches"),
        ("customers.manage", "Manage Customers", "Can create and edit customers"),
        ("products.view", "View Products", "Can view product catalog"),
        ("products.manage", "Manage Products", "Can create and edit products"),
        ("stock.view", "View Stock", "Can view inventory data"),
        ("stock.manage", "Manage Stock", "Can adjust stock and movements"),
        ("invoices.view", "View Invoices", "Can view invoices"),
        ("invoices.manage", "Manage Invoices", "Can create and finalize invoices"),
        ("statements.view", "View Statements", "Can view customer statements"),
        ("statements.manage", "Manage Statements", "Can generate statements"),
        ("creditnotes.view", "View Credit Notes", "Can view credit notes"),
        ("creditnotes.manage", "Manage Credit Notes", "Can create and issue credit notes"),
        ("reports.view", "View Reports", "Can view reports and dashboards"),
        ("settings.manage", "Manage Settings", "Can update company and system settings"),
        ("users.manage", "Manage Users", "Can manage users and roles")
    ];

    private static readonly string[] Roles =
    [
        "Super Administrator",
        "Sales",
        "Accounts",
        "Warehouse",
        "Viewer"
    ];

    public static async Task SeedReferenceDataAsync(this SalesDbContext db, IPasswordHashService passwordHasher, CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync(db, cancellationToken);
        await SeedPermissionsAsync(db, cancellationToken);
        await SeedRolePermissionLinksAsync(db, cancellationToken);
        await SeedCompanyProfileAsync(db, cancellationToken);
        await SeedInvoiceSettingsAsync(db, cancellationToken);
        await SeedSystemSettingsAsync(db, cancellationToken);
        await SeedDemoUsersAsync(db, passwordHasher, cancellationToken);
    }

    private static async Task SeedRolesAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        var existing = await db.AppRoles.Select(x => x.Name).ToListAsync(cancellationToken);
        foreach (var roleName in Roles.Where(role => !existing.Contains(role)))
        {
            db.AppRoles.Add(new AppRole
            {
                Name = roleName,
                Description = $"{roleName} role",
                Status = RecordStatus.Active
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedPermissionsAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        var existing = await db.AppPermissions.Select(x => x.Key).ToListAsync(cancellationToken);
        foreach (var permission in Permissions.Where(permission => !existing.Contains(permission.Key)))
        {
            db.AppPermissions.Add(new AppPermission
            {
                Key = permission.Key,
                Name = permission.Name,
                Description = permission.Description
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedRolePermissionLinksAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        var roleMap = await db.AppRoles.ToDictionaryAsync(x => x.Name, x => x.Id, cancellationToken);
        var permissionMap = await db.AppPermissions.ToDictionaryAsync(x => x.Key, x => x.Id, cancellationToken);

        var superAdminId = roleMap.GetValueOrDefault("Super Administrator");
        var viewerId = roleMap.GetValueOrDefault("Viewer");
        var salesId = roleMap.GetValueOrDefault("Sales");
        var accountsId = roleMap.GetValueOrDefault("Accounts");
        var warehouseId = roleMap.GetValueOrDefault("Warehouse");

        if (superAdminId != Guid.Empty)
        {
            foreach (var permissionId in permissionMap.Values)
            {
                await AddRolePermissionAsync(db, superAdminId, permissionId, cancellationToken);
            }
        }

        foreach (var permissionKey in new[] { "customers.view", "products.view", "stock.view", "invoices.view", "statements.view", "creditnotes.view", "reports.view" })
        {
            if (viewerId != Guid.Empty && permissionMap.TryGetValue(permissionKey, out var permissionId))
            {
                await AddRolePermissionAsync(db, viewerId, permissionId, cancellationToken);
            }
        }

        foreach (var permissionKey in new[] { "customers.view", "customers.manage", "products.view", "invoices.view", "invoices.manage", "statements.view", "reports.view" })
        {
            if (salesId != Guid.Empty && permissionMap.TryGetValue(permissionKey, out var permissionId))
            {
                await AddRolePermissionAsync(db, salesId, permissionId, cancellationToken);
            }
        }

        foreach (var permissionKey in new[] { "invoices.view", "invoices.manage", "statements.view", "statements.manage", "creditnotes.view", "creditnotes.manage", "reports.view", "settings.manage" })
        {
            if (accountsId != Guid.Empty && permissionMap.TryGetValue(permissionKey, out var permissionId))
            {
                await AddRolePermissionAsync(db, accountsId, permissionId, cancellationToken);
            }
        }

        foreach (var permissionKey in new[] { "stock.view", "stock.manage", "products.view", "products.manage", "reports.view" })
        {
            if (warehouseId != Guid.Empty && permissionMap.TryGetValue(permissionKey, out var permissionId))
            {
                await AddRolePermissionAsync(db, warehouseId, permissionId, cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task AddRolePermissionAsync(SalesDbContext db, Guid roleId, Guid permissionId, CancellationToken cancellationToken)
    {
        var exists = await db.AppRolePermissions.AnyAsync(x => x.AppRoleId == roleId && x.AppPermissionId == permissionId, cancellationToken);
        if (!exists)
        {
            db.AppRolePermissions.Add(new AppRolePermission { AppRoleId = roleId, AppPermissionId = permissionId });
        }
    }

    private static async Task SeedCompanyProfileAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        if (await db.CompanyProfiles.AnyAsync(cancellationToken))
        {
            return;
        }

        db.CompanyProfiles.Add(new CompanyProfile
        {
            CompanyName = "Nurtured Choice Products",
            Email = "info@nurturedchoice.co.ke",
            Phone = "+254700000000",
            Address = "Nairobi, Kenya",
            Country = "Kenya",
            CurrencyCode = "KES",
            IsActive = true
        });

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedInvoiceSettingsAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        if (await db.InvoiceNumberSettings.AnyAsync(cancellationToken))
        {
            return;
        }

        db.InvoiceNumberSettings.Add(new InvoiceNumberSettings
        {
            Prefix = "INV",
            StartingNumber = 1,
            Padding = 6,
            ResetPolicy = NumberResetPolicy.Never,
            ManualEditingAllowed = true,
            IsActive = true
        });

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedSystemSettingsAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        if (await db.SystemSettings.AnyAsync(cancellationToken))
        {
            return;
        }

        db.SystemSettings.AddRange(
            new SystemSetting
            {
                SettingKey = "theme.default",
                SettingValue = "light",
                Description = "Default application theme"
            },
            new SystemSetting
            {
                SettingKey = "app.name",
                SettingValue = "Nurtured Choice Sales System",
                Description = "Application display name"
            });

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedDemoUsersAsync(SalesDbContext db, IPasswordHashService passwordHasher, CancellationToken cancellationToken)
    {
        var existing = await db.AppUsers.FirstOrDefaultAsync(x => x.Email == "admin@nurturedchoice.co.ke", cancellationToken);
        if (existing is not null)
        {
            return;
        }

        var user = new AppUser
        {
            Email = "admin@nurturedchoice.co.ke",
            DisplayName = "System Admin",
            PhoneNumber = "+254700999000",
            IsEmailVerified = true,
            Status = RecordStatus.Active
        };
        user.PasswordHash = passwordHasher.HashPassword(user, "P@ssw0rd!");

        db.AppUsers.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        var roleId = await db.AppRoles.Where(x => x.Name == "Super Administrator").Select(x => x.Id).FirstAsync(cancellationToken);
        if (!await db.AppUserRoles.AnyAsync(x => x.AppUserId == user.Id && x.AppRoleId == roleId, cancellationToken))
        {
            db.AppUserRoles.Add(new AppUserRole { AppUserId = user.Id, AppRoleId = roleId });
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
