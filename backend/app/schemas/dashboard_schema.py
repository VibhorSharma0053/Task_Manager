from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class StatusBreakdown(BaseModel):
    TODO: int = 0
    IN_PROGRESS: int = 0
    DONE: int = 0


class PriorityBreakdown(BaseModel):
    LOW: int = 0
    MEDIUM: int = 0
    HIGH: int = 0


class TaskSummary(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    project_id: str
    project_name: Optional[str] = None
    assignee_name: Optional[str] = None


class GlobalDashboardResponse(BaseModel):
    projects_count: int
    total_tasks: int
    my_tasks_count: int
    overdue_count: int
    completed_count: int
    status_breakdown: StatusBreakdown
    priority_breakdown: PriorityBreakdown
    recent_tasks: List[TaskSummary]
    upcoming_tasks: List[TaskSummary]


class ProjectDashboardResponse(BaseModel):
    project_id: str
    project_name: str
    members_count: int
    total_tasks: int
    overdue_count: int
    completed_count: int
    status_breakdown: StatusBreakdown
    priority_breakdown: PriorityBreakdown
    recent_tasks: List[TaskSummary]
    upcoming_tasks: List[TaskSummary]