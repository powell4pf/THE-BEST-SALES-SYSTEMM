using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using NurturedChoice.Application.Abstractions;

namespace NurturedChoice.Api.Infrastructure;

public sealed class PermissionFilter : IAsyncActionFilter
{
    private readonly IPermissionService _permissions;
    private readonly ICurrentUserService _currentUser;

    public PermissionFilter(IPermissionService permissions, ICurrentUserService currentUser) { _permissions = permissions; _currentUser = currentUser; }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var required = context.ActionDescriptor.EndpointMetadata?.OfType<PermissionAttribute>().LastOrDefault();
        var allowed = required is null || await _permissions.HasPermissionAsync(_currentUser.UserId, required.Key, context.HttpContext.RequestAborted);
        if (!allowed)
        {
            context.Result = new ForbidResult();
            return;
        }
        await next();
    }
}
