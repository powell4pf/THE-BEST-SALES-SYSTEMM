# Use the official .NET 8 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy csproj and restore as distinct layers
# Copy the solution file first to leverage the build cache.
COPY *.sln .

# Copy the entire src directory. This is more robust and ensures the build context is identical to your local setup.
COPY src/ ./src/
RUN dotnet restore "*.sln"

# Build and publish the release version of the API.
RUN dotnet publish "src/NurturedChoice.Api/NurturedChoice.Api.csproj" -c Release -o /app/publish --no-restore

# Use the official .NET 8 runtime image for the final, smaller image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "NurturedChoice.Api.dll"]