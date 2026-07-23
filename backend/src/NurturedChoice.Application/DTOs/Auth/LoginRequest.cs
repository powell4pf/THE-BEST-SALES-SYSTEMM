using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Auth;

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password);

public sealed record RegisterRequest(
    [Required, MinLength(2), MaxLength(120)] string DisplayName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8), MaxLength(128)] string Password,
    [Required, MinLength(8)] string ConfirmPassword,
    string? PhoneNumber);

