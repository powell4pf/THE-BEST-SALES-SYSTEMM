namespace NurturedChoice.Application.Common;

public sealed record PagedRequest(int Page = 1, int PageSize = 20, string? Search = null)
{
    public int Skip => Math.Max(Page - 1, 0) * Math.Clamp(PageSize, 1, 200);
}

