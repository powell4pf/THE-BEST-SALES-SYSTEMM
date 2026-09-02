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
        ("customers.delete", "Delete Customers", "Can delete customers"),
        ("products.view", "View Products", "Can view product catalog"),
        ("products.manage", "Manage Products", "Can create and edit products"),
        ("products.delete", "Delete Products", "Can delete products"),
        ("stock.view", "View Stock", "Can view inventory data"),
        ("stock.manage", "Manage Stock", "Can adjust stock and movements"),
        ("invoices.view", "View Invoices", "Can view invoices"),
        ("invoices.manage", "Manage Invoices", "Can create and finalize invoices"),
        ("invoices.delete", "Delete Invoices", "Can delete invoices"),
        ("statements.view", "View Statements", "Can view customer statements"),
        ("statements.manage", "Manage Statements", "Can generate statements"),
        ("creditnotes.view", "View Credit Notes", "Can view credit notes"),
        ("creditnotes.manage", "Manage Credit Notes", "Can create and issue credit notes"),
        ("creditnotes.delete", "Delete Credit Notes", "Can delete credit notes"),
        ("deliverynotes.view", "View Delivery Notes", "Can view delivery notes"),
        ("deliverynotes.manage", "Manage Delivery Notes", "Can create and edit delivery notes"),
        ("deliverynotes.delete", "Delete Delivery Notes", "Can delete delivery notes"),
        ("payments.delete", "Delete Payments", "Can delete payments"),
        ("notifications.view", "View Notifications", "Can view document generation notifications"),
        ("reports.view", "View Reports", "Can view reports and dashboards"),
        ("settings.manage", "Manage Settings", "Can update company and system settings"),
        ("users.manage", "Manage Users", "Can manage users and roles")
    ];

    private static readonly string[] Roles =
    [
        "Super Administrator",
        "Administrator",
        "CEO",
        "Sales",
        "Accounts",
        "Warehouse",
        "Viewer",
        "Tester"
    ];

    public static async Task SeedReferenceDataAsync(this SalesDbContext db, IPasswordHashService passwordHasher, bool allowDemoAdmin, string? demoAdminPassword, CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync(db, cancellationToken);
        await SeedPermissionsAsync(db, cancellationToken);
        await SeedRolePermissionLinksAsync(db, cancellationToken);
        await SeedCompanyProfileAsync(db, cancellationToken);
        await SeedInvoiceSettingsAsync(db, cancellationToken);
        await SeedSystemSettingsAsync(db, cancellationToken);
        if (allowDemoAdmin && !string.IsNullOrWhiteSpace(demoAdminPassword))
        {
            await SeedDemoUsersAsync(db, passwordHasher, demoAdminPassword, cancellationToken);
        }
        await EnsureDesignatedOwnerRolesAsync(db, cancellationToken);
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

        var fullAccessRoleIds = roleMap
            .Where(entry => entry.Key is "Super Administrator" or "Administrator" or "CEO")
            .Select(entry => entry.Value)
            .Where(id => id != Guid.Empty)
            .ToArray();
        var viewerId = roleMap.GetValueOrDefault("Viewer");
        var testerId = roleMap.GetValueOrDefault("Tester");
        var salesId = roleMap.GetValueOrDefault("Sales");
        var accountsId = roleMap.GetValueOrDefault("Accounts");
        var warehouseId = roleMap.GetValueOrDefault("Warehouse");

        foreach (var roleId in fullAccessRoleIds)
        {
            foreach (var permissionId in permissionMap.Values)
            {
                await AddRolePermissionAsync(db, roleId, permissionId, cancellationToken);
            }
        }

        // The application exposes invoice drafting to the standard signed-in
        // workspace user, so keep the visible Generate Invoice action usable
        // for existing Viewer accounts as well as Sales and Accounts users.
        var nonDestructivePermissions = permissionMap.Keys
            .Where(key => !key.EndsWith(".delete", StringComparison.OrdinalIgnoreCase) && key is not "users.manage" and not "settings.manage")
            .ToArray();
        var restrictedRoleIds = roleMap
            .Where(entry => entry.Key is not "Super Administrator" and not "Administrator" and not "CEO")
            .Select(entry => entry.Value)
            .Where(id => id != Guid.Empty)
            .ToArray();
        var restrictedPermissionIds = permissionMap
            .Where(entry => entry.Key.EndsWith(".delete", StringComparison.OrdinalIgnoreCase) || entry.Key is "users.manage" or "settings.manage")
            .Select(entry => entry.Value)
            .ToHashSet();
        var staleDeleteLinks = await db.AppRolePermissions
            .Where(link => restrictedRoleIds.Contains(link.AppRoleId) && restrictedPermissionIds.Contains(link.AppPermissionId))
            .ToListAsync(cancellationToken);
        db.AppRolePermissions.RemoveRange(staleDeleteLinks);
        foreach (var permissionKey in nonDestructivePermissions)
        {
            foreach (var roleId in new[] { viewerId, testerId }.Where(id => id != Guid.Empty))
            {
                if (permissionMap.TryGetValue(permissionKey, out var permissionId))
                {
                    await AddRolePermissionAsync(db, roleId, permissionId, cancellationToken);
                }
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

    private static async Task EnsureDesignatedOwnerRolesAsync(SalesDbContext db, CancellationToken cancellationToken)
    {
        var roleMap = await db.AppRoles
            .Where(role => role.Name == "Super Administrator" || role.Name == "CEO")
            .ToDictionaryAsync(role => role.Name, role => role.Id, cancellationToken);
        var owners = new[]
        {
            (Email: "powellmuuo@gmail.com", Role: "Super Administrator"),
            (Email: "priscillayata@gmail.com", Role: "CEO")
        };

        foreach (var owner in owners)
        {
            if (!roleMap.TryGetValue(owner.Role, out var roleId)) continue;
            var user = await db.AppUsers.FirstOrDefaultAsync(x => x.Email == owner.Email && x.Status == RecordStatus.Active, cancellationToken);
            if (user is null) continue;

            var existingRoles = await db.AppUserRoles.Where(link => link.AppUserId == user.Id).ToListAsync(cancellationToken);
            db.AppUserRoles.RemoveRange(existingRoles.Where(link => link.AppRoleId != roleId));
            if (existingRoles.All(link => link.AppRoleId != roleId))
            {
                db.AppUserRoles.Add(new AppUserRole { AppUserId = user.Id, AppRoleId = roleId });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task AddRolePermissionAsync(SalesDbContext db, Guid roleId, Guid permissionId, CancellationToken cancellationToken)
    {
        var exists = await db.AppRolePermissions.AnyAsync(x => x.AppRoleId == roleId && x.AppPermissionId == permissionId, cancellationToken);
        var alreadyQueued = db.ChangeTracker
            .Entries<AppRolePermission>()
            .Any(entry => entry.State != EntityState.Deleted &&
                          entry.Entity.AppRoleId == roleId &&
                          entry.Entity.AppPermissionId == permissionId);

        if (!exists && !alreadyQueued)
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

    private static async Task SeedDemoUsersAsync(SalesDbContext db, IPasswordHashService passwordHasher, string demoAdminPassword, CancellationToken cancellationToken)
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
        user.PasswordHash = passwordHasher.HashPassword(user, demoAdminPassword);

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
