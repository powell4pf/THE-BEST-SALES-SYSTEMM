using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Auth;

public sealed record GoogleSignInRequest(
    [Required] string IdToken,
    [MaxLength(50)] string? PhoneNumber);
