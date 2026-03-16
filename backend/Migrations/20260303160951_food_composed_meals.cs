using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class food_composed_meals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "FoodLogs",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<Guid>(
                name: "SourceComposedMealId",
                table: "FoodLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SourceServings",
                table: "FoodLogs",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "FoodLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ComposedMeals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsFavorite = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComposedMeals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ComposedMealIngredients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ComposedMealId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    AmountGrams = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Calories = table.Column<int>(type: "int", nullable: false),
                    Proteins = table.Column<int>(type: "int", nullable: false),
                    Carbs = table.Column<int>(type: "int", nullable: false),
                    Fats = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComposedMealIngredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComposedMealIngredients_ComposedMeals_ComposedMealId",
                        column: x => x.ComposedMealId,
                        principalTable: "ComposedMeals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FoodLogs_UserId",
                table: "FoodLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FoodLogs_UserId_SourceComposedMealId",
                table: "FoodLogs",
                columns: new[] { "UserId", "SourceComposedMealId" });

            migrationBuilder.CreateIndex(
                name: "IX_FoodLogs_UserId_TimestampUtc",
                table: "FoodLogs",
                columns: new[] { "UserId", "TimestampUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ComposedMealIngredients_ComposedMealId_SortOrder",
                table: "ComposedMealIngredients",
                columns: new[] { "ComposedMealId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ComposedMeals_UserId",
                table: "ComposedMeals",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ComposedMeals_UserId_IsFavorite",
                table: "ComposedMeals",
                columns: new[] { "UserId", "IsFavorite" });

            migrationBuilder.CreateIndex(
                name: "IX_ComposedMeals_UserId_UpdatedUtc",
                table: "ComposedMeals",
                columns: new[] { "UserId", "UpdatedUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComposedMealIngredients");

            migrationBuilder.DropTable(
                name: "ComposedMeals");

            migrationBuilder.DropIndex(
                name: "IX_FoodLogs_UserId",
                table: "FoodLogs");

            migrationBuilder.DropIndex(
                name: "IX_FoodLogs_UserId_SourceComposedMealId",
                table: "FoodLogs");

            migrationBuilder.DropIndex(
                name: "IX_FoodLogs_UserId_TimestampUtc",
                table: "FoodLogs");

            migrationBuilder.DropColumn(
                name: "SourceComposedMealId",
                table: "FoodLogs");

            migrationBuilder.DropColumn(
                name: "SourceServings",
                table: "FoodLogs");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "FoodLogs");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "FoodLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
