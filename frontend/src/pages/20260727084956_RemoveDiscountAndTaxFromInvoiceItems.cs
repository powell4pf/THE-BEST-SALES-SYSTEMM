using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NurturedChoice.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDiscountAndTaxFromInvoiceItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "discount",
                table: "invoice_items");

            migrationBuilder.DropColumn(
                name: "tax",
                table: "invoice_items");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "discount",
                table: "invoice_items",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "tax",
                table: "invoice_items",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }
    }
}