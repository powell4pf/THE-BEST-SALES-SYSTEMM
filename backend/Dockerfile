# Use the official .NET 8 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy csproj and restore as distinct layers
COPY *.sln .
COPY src/NurturedChoice.Api/*.csproj ./src/NurturedChoice.Api/
COPY src/NurturedChoice.Application/*.csproj ./src/NurturedChoice.Application/
COPY src/NurturedChoice.Domain/*.csproj ./src/NurturedChoice.Domain/
COPY src/NurturedChoice.Infrastructure/*.csproj ./src/NurturedChoice.Infrastructure/
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Use the official .NET 8 runtime image for the final, smaller image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "NurturedChoice.Api.dll"]