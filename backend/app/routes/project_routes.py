from fastapi import APIRouter, Depends, status
from typing import List

from app.schemas.project_schema import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    AddMemberRequest,
    UpdateMemberRoleRequest,
    MemberResponse,
)
from app.controllers import project_controller
from app.middleware.auth_middleware import get_current_user
from app.middleware.rbac import (
    get_project_and_role,
    require_project_admin,
    require_project_owner,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


# ---------- Project CRUD ----------
@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    payload: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    return await project_controller.create_project(payload, current_user)


@router.get("", response_model=List[ProjectResponse])
async def list_projects(current_user: dict = Depends(get_current_user)):
    return await project_controller.list_my_projects(current_user)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(context: dict = Depends(get_project_and_role)):
    return await project_controller.get_project(context)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    payload: ProjectUpdate,
    context: dict = Depends(require_project_admin),
):
    return await project_controller.update_project(payload, context)


@router.delete("/{project_id}")
async def delete_project(context: dict = Depends(require_project_owner)):
    return await project_controller.delete_project(context)


# ---------- Members ----------
@router.post(
    "/{project_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    payload: AddMemberRequest,
    context: dict = Depends(require_project_admin),
):
    return await project_controller.add_member(payload, context)


@router.get("/{project_id}/members", response_model=List[MemberResponse])
async def list_members(context: dict = Depends(get_project_and_role)):
    return await project_controller.list_members(context)


@router.delete("/{project_id}/members/{user_id}")
async def remove_member(
    user_id: str,
    context: dict = Depends(require_project_admin),
):
    return await project_controller.remove_member(user_id, context)


@router.patch("/{project_id}/members/{user_id}/role")
async def update_member_role(
    user_id: str,
    payload: UpdateMemberRoleRequest,
    context: dict = Depends(require_project_admin),
):
    return await project_controller.update_member_role(user_id, payload, context)