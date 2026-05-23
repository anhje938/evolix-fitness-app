using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class GoalReportSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GoalReportSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    GoalType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    WeekStart = table.Column<DateOnly>(type: "date", nullable: false),
                    WeekEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    GeneratedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Confidence = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsLimitedReport = table.Column<bool>(type: "boolean", nullable: false),
                    ProblemIdsJson = table.Column<string>(type: "text", nullable: false),
                    RecommendationIdsJson = table.Column<string>(type: "text", nullable: false),
                    ReportJson = table.Column<string>(type: "text", nullable: false),
                    AlgorithmVersion = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoalReportSnapshots", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoalReportSnapshots_UserId_GoalType_WeekStart",
                table: "GoalReportSnapshots",
                columns: new[] { "UserId", "GoalType", "WeekStart" });

            migrationBuilder.CreateIndex(
                name: "IX_GoalReportSnapshots_UserId_GoalType_WeekStart_AlgorithmVersion",
                table: "GoalReportSnapshots",
                columns: new[] { "UserId", "GoalType", "WeekStart", "AlgorithmVersion" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoalReportSnapshots");
        }
    }
}
