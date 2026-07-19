# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /source

# Copy the entire backend project
COPY . .

# Restore all projects in the solution
RUN dotnet restore NurturedChoice.sln

# Publish the API
RUN dotnet publish src/NurturedChoice.Api/NurturedChoice.Api.csproj -c Release -o /app/publish --no-restore

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "NurturedChoice.Api.dll"]