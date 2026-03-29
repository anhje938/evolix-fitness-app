using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260329124500_AddFoodCoachExcludedDatesToUserSettings")]
    public partial class AddFoodCoachExcludedDatesToUserSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FoodCoachExcludedDateKeysJson",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FoodCoachExcludedDateKeysJson",
                table: "UserSettings");
        }
    }
}
