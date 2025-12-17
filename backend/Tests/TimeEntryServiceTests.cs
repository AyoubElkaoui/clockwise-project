using Xunit;
using Moq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend;
using FirebirdSql.Data.FirebirdClient;

namespace ClockwiseProject.Backend.Tests
{
    public class TimeEntryServiceTests
    {
        private readonly Mock<IFirebirdDataRepository> _mockRepository;
        private readonly Mock<PostgresDbContext> _mockPostgresContext;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<ILogger<TimeEntryService>> _mockLogger;
        private readonly TimeEntryService _service;

        public TimeEntryServiceTests()
        {
            _mockRepository = new Mock<IFirebirdDataRepository>();
            _mockPostgresContext = new Mock<PostgresDbContext>();
            _mockConfiguration = new Mock<IConfiguration>();
            _mockLogger = new Mock<ILogger<TimeEntryService>>();
            _service = new TimeEntryService(_mockRepository.Object, _mockPostgresContext.Object, _mockConfiguration.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task GetTimeEntriesAsync_ReturnsEntries()
        {
            // Arrange
            var medewGcId = 1;
            var from = DateTime.Now.AddDays(-7);
            var to = DateTime.Now;
            var expectedEntries = new List<TimeEntry> { new TimeEntry { GcId = 1 } };
            _mockRepository.Setup(r => r.GetTimeEntriesAsync(medewGcId, from, to)).ReturnsAsync(expectedEntries);

            // Act
            var result = await _service.GetTimeEntriesAsync(medewGcId, from, to);

            // Assert
            Assert.Equal(expectedEntries, result);
        }

        [Fact]
        public async Task InsertWorkEntriesAsync_ValidInput_InsertsSuccessfully()
        {
            // Arrange
            var medewGcId = 1;
            var dto = new BulkWorkEntryDto { UrenperGcId = 1, Regels = new List<WorkEntryDto> { new WorkEntryDto { TaakGcId = 1, WerkGcId = 1, Aantal = 8, Datum = DateTime.Now } } };
            _mockConfiguration.Setup(c => c.GetValue<int>("AdminisGcId", 1)).Returns(1);
            _mockRepository.Setup(r => r.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, 1)).ReturnsAsync(1);
            _mockRepository.Setup(r => r.EnsureUrenstatAsync(1, medewGcId, dto.UrenperGcId, It.IsAny<FbTransaction>())).Returns(Task.CompletedTask);
            _mockRepository.Setup(r => r.GetNextRegelNrAsync(1, It.IsAny<FbTransaction>())).ReturnsAsync(1);
            _mockRepository.Setup(r => r.InsertTimeEntryAsync(It.IsAny<TimeEntry>(), It.IsAny<FbTransaction>())).Returns(Task.CompletedTask);

            // Act
            await _service.InsertWorkEntriesAsync(medewGcId, dto);

            // Assert
            _mockRepository.Verify(r => r.InsertTimeEntryAsync(It.IsAny<TimeEntry>(), It.IsAny<FbTransaction>()), Times.Once);
        }

        [Fact]
        public async Task InsertWorkEntriesAsync_NoDocument_ThrowsException()
        {
            // Arrange
            var medewGcId = 1;
            var dto = new BulkWorkEntryDto { UrenperGcId = 1, Regels = new List<WorkEntryDto> { new WorkEntryDto { TaakGcId = 1, WerkGcId = 1, Aantal = 8, Datum = DateTime.Now } } };
            _mockConfiguration.Setup(c => c.GetValue<int>("AdminisGcId", 1)).Returns(1);
            _mockRepository.Setup(r => r.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, 1)).ReturnsAsync((int?)null);

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => _service.InsertWorkEntriesAsync(medewGcId, dto));
        }

        // Add more tests for validation, vacation entries, etc.
    }
}
