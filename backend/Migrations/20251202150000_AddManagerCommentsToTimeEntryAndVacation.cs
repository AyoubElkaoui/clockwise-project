using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddManagerCommentsToTimeEntryAndVacation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManagerComment",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "TimeEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewedBy",
                table: "TimeEntries",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagerComment",
                table: "VacationRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "VacationRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewedBy",
                table: "VacationRequests",
                type: "INTEGER",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManagerComment",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "ManagerComment",
                table: "VacationRequests");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "VacationRequests");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "VacationRequests");
        }
    }
}
