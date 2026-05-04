using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UserProfileOnboardingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "UserSettings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "UserSettings",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasCompletedRegistration",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "HasCompletedRegistration",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "UserSettings",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "nb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Age",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "HasCompletedRegistration",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "UserSettings");
        }
    }
}
