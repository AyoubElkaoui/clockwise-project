using System;
using FirebirdSql.EntityFrameworkCore.Firebird.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreateWithTwoStepApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    FirstName = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    LastName = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Email = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Address = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    HouseNumber = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    PostalCode = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    City = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    LoginName = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Password = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Rank = table.Column<string>(type: "VARCHAR(20)", maxLength: 20, nullable: false),
                    Function = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    ManagerId = table.Column<int>(type: "INTEGER", nullable: true),
                    ManagerIds = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Users_ManagerId",
                        column: x => x.ManagerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    CompanyId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectGroups_Companies_Com~",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    Timestamp = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Action = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Message = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    Details = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    Read = table.Column<bool>(type: "BOOLEAN", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Activities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VacationRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    Hours = table.Column<double>(type: "DOUBLE PRECISION", nullable: false),
                    Reason = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    Status = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    ManagerApprovedBy = table.Column<int>(type: "INTEGER", nullable: true),
                    ManagerApprovedByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    ManagerApprovedDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: true),
                    ManagerApprovalNotes = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    ProcessedBy = table.Column<int>(type: "INTEGER", nullable: true),
                    ProcessedDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: true),
                    ProcessingNotes = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    RequestDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VacationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VacationRequests_Users_Mana~",
                        column: x => x.ManagerApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VacationRequests_Users_Proc~",
                        column: x => x.ProcessedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VacationRequests_Users_User~",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: false),
                    ProjectGroupId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_ProjectGroups_Proj~",
                        column: x => x.ProjectGroupId,
                        principalTable: "ProjectGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimeEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartTime = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    EndTime = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    BreakMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    DistanceKm = table.Column<double>(type: "DOUBLE PRECISION", nullable: false),
                    TravelCosts = table.Column<decimal>(type: "DECIMAL(18,2)", precision: 10, scale: 2, nullable: false),
                    Expenses = table.Column<decimal>(type: "DECIMAL(18,2)", precision: 10, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    Status = table.Column<string>(type: "VARCHAR(20)", maxLength: 20, nullable: false, defaultValue: "opgeslagen"),
                    ProcessedBy = table.Column<int>(type: "INTEGER", nullable: true),
                    ProcessedDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: true),
                    ProcessingNotes = table.Column<string>(type: "BLOB SUB_TYPE TEXT", nullable: true),
                    RequestDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeEntries_Projects_Projec~",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimeEntries_Users_Processed~",
                        column: x => x.ProcessedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TimeEntries_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserProjects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Fb:ValueGenerationStrategy", FbValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    AssignedDate = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    AssignedByUserId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserProjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserProjects_Projects_Proje~",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserProjects_Users_Assigned~",
                        column: x => x.AssignedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserProjects_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId",
                table: "Activities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectGroups_CompanyId",
                table: "ProjectGroups",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ProjectGroupId",
                table: "Projects",
                column: "ProjectGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_ProcessedBy",
                table: "TimeEntries",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_ProjectId",
                table: "TimeEntries",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_UserId",
                table: "TimeEntries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserProjects_AssignedByUser~",
                table: "UserProjects",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserProjects_ProjectId",
                table: "UserProjects",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UserProjects_UserId",
                table: "UserProjects",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_ManagerId",
                table: "Users",
                column: "ManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_ManagerApp~",
                table: "VacationRequests",
                column: "ManagerApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_ProcessedBy",
                table: "VacationRequests",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_VacationRequests_UserId",
                table: "VacationRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "TimeEntries");

            migrationBuilder.DropTable(
                name: "UserProjects");

            migrationBuilder.DropTable(
                name: "VacationRequests");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "ProjectGroups");

            migrationBuilder.DropTable(
                name: "Companies");
        }
    }
}
