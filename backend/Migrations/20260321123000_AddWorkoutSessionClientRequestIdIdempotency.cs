using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260321123000_AddWorkoutSessionClientRequestIdIdempotency")]
    public partial class AddWorkoutSessionClientRequestIdIdempotency : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "WorkoutSessions",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "ClientRequestId",
                table: "WorkoutSessions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ClientRequestId",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ClientRequestId" },
                unique: true,
                filter: "[ClientRequestId] IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_UserId_ClientRequestId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "WorkoutSessions");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "WorkoutSessions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450);
        }
    }
}
