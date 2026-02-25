using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixWorkoutSessionRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutExerciseLogs_Exercises_ExerciseId",
                table: "WorkoutExerciseLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutSessions_Workouts_WorkoutId",
                table: "WorkoutSessions");

            migrationBuilder.AddColumn<Guid>(
                name: "WorkoutProgramId",
                table: "WorkoutSessions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_WorkoutProgramId",
                table: "WorkoutSessions",
                column: "WorkoutProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutExerciseLogs_Exercises_ExerciseId",
                table: "WorkoutExerciseLogs",
                column: "ExerciseId",
                principalTable: "Exercises",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutSessions_WorkoutPrograms_WorkoutProgramId",
                table: "WorkoutSessions",
                column: "WorkoutProgramId",
                principalTable: "WorkoutPrograms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutSessions_Workouts_WorkoutId",
                table: "WorkoutSessions",
                column: "WorkoutId",
                principalTable: "Workouts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutExerciseLogs_Exercises_ExerciseId",
                table: "WorkoutExerciseLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutSessions_WorkoutPrograms_WorkoutProgramId",
                table: "WorkoutSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutSessions_Workouts_WorkoutId",
                table: "WorkoutSessions");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_WorkoutProgramId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "WorkoutProgramId",
                table: "WorkoutSessions");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutExerciseLogs_Exercises_ExerciseId",
                table: "WorkoutExerciseLogs",
                column: "ExerciseId",
                principalTable: "Exercises",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutSessions_Workouts_WorkoutId",
                table: "WorkoutSessions",
                column: "WorkoutId",
                principalTable: "Workouts",
                principalColumn: "Id");
        }
    }
}
