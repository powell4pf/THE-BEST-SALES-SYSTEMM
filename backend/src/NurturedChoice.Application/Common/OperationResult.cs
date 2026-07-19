namespace NurturedChoice.Application.Common;

public sealed record OperationResult(bool IsSuccess, string? Error = null)
{
    public static OperationResult Success() => new(true);

    public static OperationResult Fail(string error) => new(false, error);
}

