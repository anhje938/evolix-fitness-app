using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260327160000_AddWorkoutSessionSubmissionHashIdempotency")]
    public partial class AddWorkoutSessionSubmissionHashIdempotency : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubmissionHash",
                table: "WorkoutSessions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_SubmissionHash",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "SubmissionHash" },
                unique: true,
                filter: "[SubmissionHash] IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_UserId_SubmissionHash",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "SubmissionHash",
                table: "WorkoutSessions");
        }
    }
}
