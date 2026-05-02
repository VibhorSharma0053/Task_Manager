from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional

from app.schemas.task_schema import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskResponse,
)
from app.controllers import task_controller
from app.middleware.auth_middleware import get_current_user
from app.middleware.rbac import (
    get_project_and_role,
    require_project_admin,
)


# ---------- Project-scoped task routes ----------
project_task_router = APIRouter(
    prefix="/api/projects/{project_id}/tasks",
    tags=["Tasks"],
)


@project_task_router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    payload: TaskCreate,
    context: dict = Depends(require_project_admin),
):
    return await task_controller.create_task(payload, context)


@project_task_router.get("", response_model=List[TaskResponse])
async def list_project_tasks(
    context: dict = Depends(get_project_and_role),
    status_filter: Optional[str] = Query(None, alias="status"),
    assignee_id: Optional[str] = Query(None),
):
    return await task_controller.list_project_tasks(
        context, status_filter=status_filter, assignee_id=assignee_id
    )


# ---------- Task-scoped routes ----------
task_router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@task_router.get("/my", response_model=List[TaskResponse])
async def my_tasks(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    return await task_controller.list_my_tasks(current_user, status_filter)


@task_router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await task_controller.get_task(task_id, current_user)


@task_router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await task_controller.update_task(task_id, payload, current_user)


@task_router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await task_controller.update_task_status(task_id, payload, current_user)


@task_router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await task_controller.delete_task(task_id, current_user)