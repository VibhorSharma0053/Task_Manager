from fastapi import HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId

from app.database import get_db
from app.schemas.project_schema import (
    ProjectCreate,
    ProjectUpdate,
    AddMemberRequest,
    UpdateMemberRoleRequest,
)


# ---------------- Projects ----------------
async def create_project(payload: ProjectCreate, current_user: dict):
    db = get_db()
    now = datetime.now(timezone.utc)

    project_doc = {
        "name": payload.name.strip(),
        "description": (payload.description or "").strip(),
        "owner_id": ObjectId(current_user["id"]),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(project_doc)
    project_id = result.inserted_id

    # Add creator as ADMIN
    await db.project_members.insert_one(
        {
            "project_id": project_id,
            "user_id": ObjectId(current_user["id"]),
            "role": "ADMIN",
            "joined_at": now,
        }
    )

    return {
        "id": str(project_id),
        "name": project_doc["name"],
        "description": project_doc["description"],
        "owner_id": current_user["id"],
        "my_role": "ADMIN",
        "members_count": 1,
        "created_at": now,
        "updated_at": now,
    }


async def list_my_projects(current_user: dict):
    db = get_db()
    user_oid = ObjectId(current_user["id"])

    # Find all project_ids where user is a member
    memberships = db.project_members.find({"user_id": user_oid})
    project_ids = []
    role_map = {}
    async for m in memberships:
        project_ids.append(m["project_id"])
        role_map[str(m["project_id"])] = m["role"]

    if not project_ids:
        return []

    projects_cursor = db.projects.find({"_id": {"$in": project_ids}}).sort(
        "created_at", -1
    )
    projects = []
    async for p in projects_cursor:
        pid_str = str(p["_id"])
        members_count = await db.project_members.count_documents(
            {"project_id": p["_id"]}
        )
        projects.append(
            {
                "id": pid_str,
                "name": p["name"],
                "description": p.get("description", ""),
                "owner_id": str(p["owner_id"]),
                "my_role": role_map.get(pid_str, "MEMBER"),
                "members_count": members_count,
                "created_at": p["created_at"],
                "updated_at": p["updated_at"],
            }
        )
    return projects


async def get_project(context: dict):
    db = get_db()
    project = context["project"]
    members_count = await db.project_members.count_documents(
        {"project_id": project["_id"]}
    )
    return {
        "id": str(project["_id"]),
        "name": project["name"],
        "description": project.get("description", ""),
        "owner_id": str(project["owner_id"]),
        "my_role": context["role"],
        "members_count": members_count,
        "created_at": project["created_at"],
        "updated_at": project["updated_at"],
    }


async def update_project(payload: ProjectUpdate, context: dict):
    db = get_db()
    project = context["project"]

    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name.strip()
    if payload.description is not None:
        update_fields["description"] = payload.description.strip()

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.projects.update_one(
        {"_id": project["_id"]}, {"$set": update_fields}
    )

    updated = await db.projects.find_one({"_id": project["_id"]})
    members_count = await db.project_members.count_documents(
        {"project_id": project["_id"]}
    )
    return {
        "id": str(updated["_id"]),
        "name": updated["name"],
        "description": updated.get("description", ""),
        "owner_id": str(updated["owner_id"]),
        "my_role": context["role"],
        "members_count": members_count,
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
    }


async def delete_project(context: dict):
    db = get_db()
    project = context["project"]

    # Cascade delete: members + tasks + project
    await db.project_members.delete_many({"project_id": project["_id"]})
    await db.tasks.delete_many({"project_id": project["_id"]})
    await db.projects.delete_one({"_id": project["_id"]})

    return {"message": "Project deleted successfully"}


# ---------------- Members ----------------
async def add_member(payload: AddMemberRequest, context: dict):
    db = get_db()
    project = context["project"]

    user = await db.users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with this email",
        )

    existing = await db.project_members.find_one(
        {"project_id": project["_id"], "user_id": user["_id"]}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project",
        )

    now = datetime.now(timezone.utc)
    result = await db.project_members.insert_one(
        {
            "project_id": project["_id"],
            "user_id": user["_id"],
            "role": payload.role,
            "joined_at": now,
        }
    )

    return {
        "id": str(result.inserted_id),
        "user_id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": payload.role,
        "joined_at": now,
    }


async def list_members(context: dict):
    db = get_db()
    project = context["project"]

    members = []
    cursor = db.project_members.find({"project_id": project["_id"]}).sort(
        "joined_at", 1
    )
    async for m in cursor:
        user = await db.users.find_one({"_id": m["user_id"]})
        if not user:
            continue
        members.append(
            {
                "id": str(m["_id"]),
                "user_id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": m["role"],
                "joined_at": m["joined_at"],
            }
        )
    return members


async def remove_member(user_id: str, context: dict):
    from app.utils.objectid import is_valid_objectid

    if not is_valid_objectid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    db = get_db()
    project = context["project"]

    # Cannot remove the owner
    if str(project["owner_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the project owner",
        )

    result = await db.project_members.delete_one(
        {"project_id": project["_id"], "user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Unassign tasks assigned to this user in this project
    await db.tasks.update_many(
        {"project_id": project["_id"], "assignee_id": ObjectId(user_id)},
        {"$set": {"assignee_id": None}},
    )

    return {"message": "Member removed successfully"}


async def update_member_role(
    user_id: str, payload: UpdateMemberRoleRequest, context: dict
):
    from app.utils.objectid import is_valid_objectid

    if not is_valid_objectid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    db = get_db()
    project = context["project"]

    # Owner role can't be changed
    if str(project["owner_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the project owner's role",
        )

    result = await db.project_members.update_one(
        {"project_id": project["_id"], "user_id": ObjectId(user_id)},
        {"$set": {"role": payload.role}},
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return {"message": f"Member role updated to {payload.role}"}