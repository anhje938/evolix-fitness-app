using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class usersettings_split_homeui_columns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HomeSectionOrderJson",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[\"quickStart\",\"goals\",\"weight\",\"recoveryMap\"]");

            migrationBuilder.AddColumn<string>(
                name: "RecoveryMapHiddenMusclesJson",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<bool>(
                name: "ShowOnlyCustomTrainingContent",
                table: "UserSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE [UserSettings]
                SET
                    [HomeSectionOrderJson] = COALESCE([HomeSectionOrderJson], N'["quickStart","goals","weight","recoveryMap"]'),
                    [RecoveryMapHiddenMusclesJson] = COALESCE([RecoveryMapHiddenMusclesJson], N'[]')
                """);

            migrationBuilder.Sql(
                """
                UPDATE [UserSettings]
                SET
                    [HomeSectionOrderJson] = COALESCE(JSON_QUERY([HomeProgressCirclesJson], '$.homeSectionOrder'), [HomeSectionOrderJson]),
                    [RecoveryMapHiddenMusclesJson] = COALESCE(JSON_QUERY([HomeProgressCirclesJson], '$.recoveryMapHiddenMuscles'), [RecoveryMapHiddenMusclesJson]),
                    [ShowOnlyCustomTrainingContent] =
                        CASE
                            WHEN JSON_VALUE([HomeProgressCirclesJson], '$.showOnlyCustomTrainingContent') IN (N'true', N'True', N'TRUE', N'1')
                                THEN CAST(1 AS bit)
                            WHEN JSON_VALUE([HomeProgressCirclesJson], '$.showOnlyCustomTrainingContent') IN (N'false', N'False', N'FALSE', N'0')
                                THEN CAST(0 AS bit)
                            ELSE [ShowOnlyCustomTrainingContent]
                        END,
                    [HomeProgressCirclesJson] =
                        COALESCE(JSON_QUERY([HomeProgressCirclesJson], '$.homeProgressCircles'), [HomeProgressCirclesJson])
                WHERE ISJSON([HomeProgressCirclesJson]) = 1
                    AND LEFT(LTRIM([HomeProgressCirclesJson]), 1) = '{'
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HomeSectionOrderJson",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "RecoveryMapHiddenMusclesJson",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowOnlyCustomTrainingContent",
                table: "UserSettings");
        }
    }
}
