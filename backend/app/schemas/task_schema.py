from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal


TaskStatus = Literal["TODO", "IN_PROGRESS", "DONE"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH"]


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=2000)
    status: TaskStatus = "TODO"
    priority: TaskPriority = "MEDIUM"
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None  # user id


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskResponse(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str] = None
    title: str
    description: Optional[str] = ""
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime