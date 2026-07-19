using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Auth;

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password);

