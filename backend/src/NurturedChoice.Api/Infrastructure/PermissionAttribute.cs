namespace NurturedChoice.Api.Infrastructure;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class PermissionAttribute(string key) : Attribute
{
    public string Key { get; } = key;
}
