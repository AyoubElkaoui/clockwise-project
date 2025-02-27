using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompaniesAndProjectGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BreakMinutes",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "DistanceKm",
                table: "TimeEntries",
                type: "DOUBLE PRECISION",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<decimal>(
                name: "Expenses",
                table: "TimeEntries",
                type: "DECIMAL(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "TimeEntries",
                type: "BLOB SUB_TYPE TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TravelCosts",
                table: "TimeEntries",
                type: "DECIMAL(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_ProjectId",
                table: "TimeEntries",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_UserId",
                table: "TimeEntries",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_Projects_Projec~",
                table: "TimeEntries",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_Projects_Projec~",
                table: "TimeEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_ProjectId",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_UserId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "BreakMinutes",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "DistanceKm",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "Expenses",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "TravelCosts",
                table: "TimeEntries");
        }
    }
}
