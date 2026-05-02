from fastapi import Depends, HTTPException, status, Path
from bson import ObjectId

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.utils.objectid import is_valid_objectid


async def get_project_and_role(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Fetch the project and the current user's role in it."""
    if not is_valid_objectid(project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project id",
        )

    db = get_db()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    membership = await db.project_members.find_one(
        {
            "project_id": ObjectId(project_id),
            "user_id": ObjectId(current_user["id"]),
        }
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )

    return {
        "project": project,
        "role": membership["role"],
        "current_user": current_user,
    }


async def require_project_admin(
    context: dict = Depends(get_project_and_role),
):
    """Ensure the current user is an ADMIN in the project."""
    if context["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return context


async def require_project_owner(
    context: dict = Depends(get_project_and_role),
):
    """Ensure the current user is the project owner."""
    project = context["project"]
    current_user = context["current_user"]
    if str(project["owner_id"]) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can perform this action",
        )
    return context