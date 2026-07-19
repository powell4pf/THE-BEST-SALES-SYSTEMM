using NurturedChoice.Application.Abstractions;

namespace NurturedChoice.Infrastructure;

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}

