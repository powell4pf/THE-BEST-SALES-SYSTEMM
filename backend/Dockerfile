FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

COPY . .

RUN dotnet restore NurturedChoice.sln
RUN dotnet publish src/NurturedChoice.Api/NurturedChoice.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

ENV DOTNET_USE_POLLING_FILE_WATCHER=false
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
ENV ASPNETCORE_URLS=http://+:10000

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet","NurturedChoice.Api.dll"]