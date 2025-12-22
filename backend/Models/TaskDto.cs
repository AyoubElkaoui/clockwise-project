namespace backend.Models;

public class TaskDto
{
    public int Id { get; set; }              // GC_ID
    public string Code { get; set; }         // GC_CODE
    public string Description { get; set; }  // GC_OMSCHRIJVING
    public string? ShortName { get; set; }   // GC_KORTE_NAAM
    public bool IsHistorical { get; set; }   // GC_HISTORISCH_JN == 'J'
}

public class TasksResponse
{
    public List<TaskDto> Tasks { get; set; } = new();
    public int TotalCount { get; set; }
}

public class GetTasksQuery
{
    public bool IncludeHistorical { get; set; } = false;
}
