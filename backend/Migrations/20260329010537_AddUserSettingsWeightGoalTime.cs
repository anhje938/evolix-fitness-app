using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSettingsWeightGoalTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "WeightGoalTimeUtc",
                table: "UserSettings",
                type: "datetime2",
                nullable: false,
                defaultValueSql:
                    "DATEADD(hour, 12, CAST(CAST(DATEADD(day, 84, GETUTCDATE()) AS date) AS datetime2))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeightGoalTimeUtc",
                table: "UserSettings");
        }
    }
}
