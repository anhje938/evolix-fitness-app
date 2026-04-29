using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AdaptivePlanningMvp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Exercises",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultProgressionStepKg",
                table: "Exercises",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EquipmentType",
                table: "Exercises",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBodyweight",
                table: "Exercises",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsCompound",
                table: "Exercises",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsIsolation",
                table: "Exercises",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "CoachSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    AdaptiveNutritionEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AdaptiveTrainingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AutoApplyLowRiskSuggestions = table.Column<bool>(type: "boolean", nullable: false),
                    PreferredReportDay = table.Column<int>(type: "integer", nullable: false),
                    AggressivenessLevel = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoachSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseMuscles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExerciseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Muscle = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Contribution = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseMuscles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseMuscles_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseTargets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    ExerciseId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetSets = table.Column<int>(type: "integer", nullable: false),
                    MinReps = table.Column<int>(type: "integer", nullable: false),
                    MaxReps = table.Column<int>(type: "integer", nullable: false),
                    TargetWeightKg = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    ProgressionModel = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseTargets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseTargets_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    WeekStart = table.Column<DateOnly>(type: "date", nullable: false),
                    WeekEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    GeneratedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataQuality = table.Column<int>(type: "integer", nullable: false),
                    OverallScore = table.Column<int>(type: "integer", nullable: true),
                    SummaryText = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    AlgorithmVersion = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdaptiveRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    SourceReportId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Explanation = table.Column<string>(type: "character varying(900)", maxLength: 900, nullable: false),
                    Confidence = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AppliesFromDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdaptiveRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdaptiveRecommendations_WeeklyReports_SourceReportId",
                        column: x => x.SourceReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportMuscleBalanceSummaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    Muscle = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Sets = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    VolumeKg = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportMuscleBalanceSummaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportMuscleBalanceSummaries_WeeklyReports_WeeklyRepo~",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportNextWeekActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Text = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportNextWeekActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportNextWeekActions_WeeklyReports_WeeklyReportId",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportNutritionSummaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoggedDays = table.Column<int>(type: "integer", nullable: false),
                    AverageCalories = table.Column<int>(type: "integer", nullable: true),
                    TargetCalories = table.Column<int>(type: "integer", nullable: false),
                    AverageProtein = table.Column<int>(type: "integer", nullable: true),
                    TargetProtein = table.Column<int>(type: "integer", nullable: false),
                    AverageCarbs = table.Column<int>(type: "integer", nullable: true),
                    TargetCarbs = table.Column<int>(type: "integer", nullable: false),
                    AverageFat = table.Column<int>(type: "integer", nullable: true),
                    TargetFat = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Insight = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportNutritionSummaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportNutritionSummaries_WeeklyReports_WeeklyReportId",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportRecoverySummaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReadyMusclesText = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    RestMusclesText = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    RecommendedNextSession = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    IntensityRecommendation = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Insight = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportRecoverySummaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportRecoverySummaries_WeeklyReports_WeeklyReportId",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportTrainingSummaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedWorkouts = table.Column<int>(type: "integer", nullable: false),
                    TotalSets = table.Column<int>(type: "integer", nullable: false),
                    TotalReps = table.Column<int>(type: "integer", nullable: false),
                    TotalVolumeKg = table.Column<double>(type: "double precision", nullable: false),
                    ExercisesImproved = table.Column<int>(type: "integer", nullable: false),
                    ExercisesMaintained = table.Column<int>(type: "integer", nullable: false),
                    ExercisesDecreased = table.Column<int>(type: "integer", nullable: false),
                    BestProgressExerciseId = table.Column<Guid>(type: "uuid", nullable: true),
                    BestProgressText = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    Insight = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportTrainingSummaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportTrainingSummaries_WeeklyReports_WeeklyReportId",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReportWeightSummaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WeeklyReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTrendWeightKg = table.Column<double>(type: "double precision", nullable: true),
                    EndTrendWeightKg = table.Column<double>(type: "double precision", nullable: true),
                    WeeklyChangeKg = table.Column<double>(type: "double precision", nullable: true),
                    ExpectedWeeklyChangeKg = table.Column<double>(type: "double precision", nullable: true),
                    EstimatedGoalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    WeightLogsCount = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Insight = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReportWeightSummaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyReportWeightSummaries_WeeklyReports_WeeklyReportId",
                        column: x => x.WeeklyReportId,
                        principalTable: "WeeklyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NutritionTargetsHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Calories = table.Column<int>(type: "integer", nullable: false),
                    Protein = table.Column<int>(type: "integer", nullable: false),
                    Carbs = table.Column<int>(type: "integer", nullable: false),
                    Fat = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActiveFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NutritionTargetsHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NutritionTargetsHistory_AdaptiveRecommendations_Recommendat~",
                        column: x => x.RecommendationId,
                        principalTable: "AdaptiveRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationExerciseTargetChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExerciseId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentTargetSets = table.Column<int>(type: "integer", nullable: true),
                    SuggestedTargetSets = table.Column<int>(type: "integer", nullable: true),
                    MinReps = table.Column<int>(type: "integer", nullable: true),
                    MaxReps = table.Column<int>(type: "integer", nullable: true),
                    CurrentTargetWeightKg = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    SuggestedTargetWeightKg = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    ProgressionModel = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationExerciseTargetChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationExerciseTargetChanges_AdaptiveRecommendations~",
                        column: x => x.RecommendationId,
                        principalTable: "AdaptiveRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecommendationExerciseTargetChanges_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationNutritionChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentCalories = table.Column<int>(type: "integer", nullable: true),
                    SuggestedCalories = table.Column<int>(type: "integer", nullable: true),
                    CurrentProtein = table.Column<int>(type: "integer", nullable: true),
                    SuggestedProtein = table.Column<int>(type: "integer", nullable: true),
                    CurrentCarbs = table.Column<int>(type: "integer", nullable: true),
                    SuggestedCarbs = table.Column<int>(type: "integer", nullable: true),
                    CurrentFat = table.Column<int>(type: "integer", nullable: true),
                    SuggestedFat = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationNutritionChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationNutritionChanges_AdaptiveRecommendations_Reco~",
                        column: x => x.RecommendationId,
                        principalTable: "AdaptiveRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationRecoveryActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendedSession = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Intensity = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FocusMusclesText = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    RestMusclesText = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationRecoveryActions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationRecoveryActions_AdaptiveRecommendations_Recom~",
                        column: x => x.RecommendationId,
                        principalTable: "AdaptiveRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationTargetDateChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentTargetDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SuggestedTargetDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentWeeklyPaceKg = table.Column<double>(type: "double precision", nullable: false),
                    SuggestedWeeklyPaceKg = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationTargetDateChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationTargetDateChanges_AdaptiveRecommendations_Rec~",
                        column: x => x.RecommendationId,
                        principalTable: "AdaptiveRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdaptiveRecommendations_SourceReportId",
                table: "AdaptiveRecommendations",
                column: "SourceReportId");

            migrationBuilder.CreateIndex(
                name: "IX_AdaptiveRecommendations_UserId_Status_ExpiresAtUtc",
                table: "AdaptiveRecommendations",
                columns: new[] { "UserId", "Status", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CoachSettings_UserId",
                table: "CoachSettings",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseMuscles_ExerciseId_Muscle_Role",
                table: "ExerciseMuscles",
                columns: new[] { "ExerciseId", "Muscle", "Role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseTargets_ExerciseId",
                table: "ExerciseTargets",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseTargets_UserId_ExerciseId",
                table: "ExerciseTargets",
                columns: new[] { "UserId", "ExerciseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTargetsHistory_RecommendationId",
                table: "NutritionTargetsHistory",
                column: "RecommendationId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionTargetsHistory_UserId_ActiveFrom",
                table: "NutritionTargetsHistory",
                columns: new[] { "UserId", "ActiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationExerciseTargetChanges_ExerciseId",
                table: "RecommendationExerciseTargetChanges",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationExerciseTargetChanges_RecommendationId",
                table: "RecommendationExerciseTargetChanges",
                column: "RecommendationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationNutritionChanges_RecommendationId",
                table: "RecommendationNutritionChanges",
                column: "RecommendationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationRecoveryActions_RecommendationId",
                table: "RecommendationRecoveryActions",
                column: "RecommendationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationTargetDateChanges_RecommendationId",
                table: "RecommendationTargetDateChanges",
                column: "RecommendationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportMuscleBalanceSummaries_WeeklyReportId_Muscle",
                table: "WeeklyReportMuscleBalanceSummaries",
                columns: new[] { "WeeklyReportId", "Muscle" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportNextWeekActions_WeeklyReportId_SortOrder",
                table: "WeeklyReportNextWeekActions",
                columns: new[] { "WeeklyReportId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportNutritionSummaries_WeeklyReportId",
                table: "WeeklyReportNutritionSummaries",
                column: "WeeklyReportId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportRecoverySummaries_WeeklyReportId",
                table: "WeeklyReportRecoverySummaries",
                column: "WeeklyReportId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReports_UserId_WeekStart_WeekEnd_AlgorithmVersion",
                table: "WeeklyReports",
                columns: new[] { "UserId", "WeekStart", "WeekEnd", "AlgorithmVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportTrainingSummaries_WeeklyReportId",
                table: "WeeklyReportTrainingSummaries",
                column: "WeeklyReportId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportWeightSummaries_WeeklyReportId",
                table: "WeeklyReportWeightSummaries",
                column: "WeeklyReportId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoachSettings");

            migrationBuilder.DropTable(
                name: "ExerciseMuscles");

            migrationBuilder.DropTable(
                name: "ExerciseTargets");

            migrationBuilder.DropTable(
                name: "NutritionTargetsHistory");

            migrationBuilder.DropTable(
                name: "RecommendationExerciseTargetChanges");

            migrationBuilder.DropTable(
                name: "RecommendationNutritionChanges");

            migrationBuilder.DropTable(
                name: "RecommendationRecoveryActions");

            migrationBuilder.DropTable(
                name: "RecommendationTargetDateChanges");

            migrationBuilder.DropTable(
                name: "WeeklyReportMuscleBalanceSummaries");

            migrationBuilder.DropTable(
                name: "WeeklyReportNextWeekActions");

            migrationBuilder.DropTable(
                name: "WeeklyReportNutritionSummaries");

            migrationBuilder.DropTable(
                name: "WeeklyReportRecoverySummaries");

            migrationBuilder.DropTable(
                name: "WeeklyReportTrainingSummaries");

            migrationBuilder.DropTable(
                name: "WeeklyReportWeightSummaries");

            migrationBuilder.DropTable(
                name: "AdaptiveRecommendations");

            migrationBuilder.DropTable(
                name: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "DefaultProgressionStepKg",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "EquipmentType",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "IsBodyweight",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "IsCompound",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "IsIsolation",
                table: "Exercises");
        }
    }
}
