using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Api.Bootstrap;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Infrastructure;
using NurturedChoice.Infrastructure.Authentication;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    // Resolve appsettings.json beside the API binaries, not from whatever folder
    // happened to launch the process. This prevents the frontend's shared
    // "Failed to fetch" error when the API is started from the repository root.
    ContentRootPath = AppContext.BaseDirectory
});

// Keep local/server diagnostics on stdout. The Windows EventLog provider can
// throw when the process lacks permission to write the .NET Runtime source,
// masking the actual API/database exception from the client.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Configuration.Sources.Clear();
var configurationBuilder = builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);

if (builder.Environment.IsDevelopment())
{
    configurationBuilder.AddUserSecrets<Program>(optional: true);
}

configurationBuilder.AddEnvironmentVariables();

builder.Services.AddControllers();
builder.Services.AddScoped<PermissionFilter>();
builder.Services.Configure<Microsoft.AspNetCore.Mvc.MvcOptions>(options => options.Filters.AddService<PermissionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.SectionName));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<GoogleTokenService>();

builder.Services.AddHealthChecks();
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

if (builder.Environment.IsProduction())
{
    if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) ||
        jwtOptions.SigningKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase) ||
        jwtOptions.SigningKey.Length < 32)
    {
        throw new InvalidOperationException(
            "Refusing to start in Production: Jwt:SigningKey is missing, too short, or still set to its " +
            "development default. Set the Jwt__SigningKey environment variable to a strong, unique secret " +
            "(32+ random characters) before deploying.");
    }

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString) ||
        connectionString.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "Refusing to start in Production: ConnectionStrings:DefaultConnection is missing or still set to " +
            "its placeholder value. Set the ConnectionStrings__DefaultConnection environment variable before deploying.");
    }

    var allowedHosts = builder.Configuration["AllowedHosts"];
    if (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts == "*")
    {
        throw new InvalidOperationException("Refusing to start in Production: AllowedHosts must name the deployed API host.");
    }
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (origins is null || origins.Length == 0)
    {
        if (builder.Environment.IsProduction())
        {
            throw new InvalidOperationException("Refusing to start in Production: Cors:AllowedOrigins must contain the deployed frontend origin.");
        }

        origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    }
    else
    {
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    }
}));

var app = builder.Build();
await app.BootstrapAsync();
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
    var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    logger.LogError(exception, "Unhandled request failure for {Method} {Path}", context.Request.Method, context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "application/problem+json";
    await context.Response.WriteAsJsonAsync(new
    {
        type = "https://httpstatuses.com/500",
        title = "Unexpected server error",
        status = StatusCodes.Status500InternalServerError,
        detail = "An unexpected error occurred.",
        traceId = context.TraceIdentifier
    });
}));
if (builder.Configuration.GetValue("HttpsRedirection:Enabled", false))
{
    app.UseHttpsRedirection();
}
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/v1/health");
app.MapGet("/", () => Results.Ok(new { service = "NurturedChoice Api", status = "running", version = "v1" }));
app.Run();
