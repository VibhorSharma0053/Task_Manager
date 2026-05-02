from fastapi import APIRouter, Depends

from app.schemas.dashboard_schema import (
    GlobalDashboardResponse,
    ProjectDashboardResponse,
)
from app.controllers import dashboard_controller
from app.middleware.auth_middleware import get_current_user
from app.middleware.rbac import get_project_and_role

# Global dashboard
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@dashboard_router.get("", response_model=GlobalDashboardResponse)
async def global_dashboard(current_user: dict = Depends(get_current_user)):
    return await dashboard_controller.get_global_dashboard(current_user)


# Project dashboard (lives under /api/projects/{id}/dashboard)
project_dashboard_router = APIRouter(
    prefix="/api/projects/{project_id}/dashboard",
    tags=["Dashboard"],
)


@project_dashboard_router.get("", response_model=ProjectDashboardResponse)
async def project_dashboard(context: dict = Depends(get_project_and_role)):
    return await dashboard_controller.get_project_dashboard(context)