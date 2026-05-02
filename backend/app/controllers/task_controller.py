from fastapi import HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

from app.database import get_db
from app.schemas.task_schema import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
)
from app.utils.objectid import is_valid_objectid


# ---------------- Helpers ----------------
async def _enrich_task(task: dict, db) -> dict:
    """Enrich a task document with assignee, project, and creator names."""
    now = datetime.now(timezone.utc)

    assignee_name = None
    assignee_email = None
    if task.get("assignee_id"):
        user = await db.users.find_one({"_id": task["assignee_id"]})
        if user:
            assignee_name = user["name"]
            assignee_email = user["email"]

    creator_name = None
    if task.get("created_by"):
        creator = await db.users.find_one({"_id": task["created_by"]})
        if creator:
            creator_name = creator["name"]

    project_name = None
    project = await db.projects.find_one({"_id": task["project_id"]})
    if project:
        project_name = project["name"]

    due_date = task.get("due_date")
    is_overdue = bool(
        due_date
        and task.get("status") != "DONE"
        and due_date.replace(tzinfo=timezone.utc) if due_date.tzinfo is None else due_date
    )
    if due_date:
        # normalize tz
        d = due_date if due_date.tzinfo else due_date.replace(tzinfo=timezone.utc)
        is_overdue = d < now and task.get("status") != "DONE"
    else:
        is_overdue = False

    return {
        "id": str(task["_id"]),
        "project_id": str(task["project_id"]),
        "project_name": project_name,
        "title": task["title"],
        "description": task.get("description", ""),
        "status": task["status"],
        "priority": task["priority"],
        "due_date": due_date,
        "is_overdue": is_overdue,
        "assignee_id": str(task["assignee_id"]) if task.get("assignee_id") else None,
        "assignee_name": assignee_name,
        "assignee_email": assignee_email,
        "created_by": str(task["created_by"]),
        "created_by_name": creator_name,
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
    }


async def _ensure_assignee_is_member(project_id: ObjectId, assignee_id: str, db):
    """Ensure the assignee is a member of the project."""
    if not is_valid_objectid(assignee_id):
        raise HTTPException(status_code=400, detail="Invalid assignee id")

    membership = await db.project_members.find_one(
        {"project_id": project_id, "user_id": ObjectId(assignee_id)}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a member of this project",
        )


# ---------------- Create ----------------
async def create_task(payload: TaskCreate, context: dict):
    db = get_db()
    project = context["project"]
    current_user = context["current_user"]

    assignee_oid = None
    if payload.assignee_id:
        await _ensure_assignee_is_member(project["_id"], payload.assignee_id, db)
        assignee_oid = ObjectId(payload.assignee_id)

    now = datetime.now(timezone.utc)
    task_doc = {
        "project_id": project["_id"],
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "status": payload.status,
        "priority": payload.priority,
        "due_date": payload.due_date,
        "assignee_id": assignee_oid,
        "created_by": ObjectId(current_user["id"]),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id
    return await _enrich_task(task_doc, db)


# ---------------- List (project) ----------------
async def list_project_tasks(
    context: dict,
    status_filter: Optional[str] = None,
    assignee_id: Optional[str] = None,
):
    db = get_db()
    project = context["project"]

    query = {"project_id": project["_id"]}
    if status_filter:
        query["status"] = status_filter
    if assignee_id:
        if not is_valid_objectid(assignee_id):
            raise HTTPException(status_code=400, detail="Invalid assignee id")
        query["assignee_id"] = ObjectId(assignee_id)

    cursor = db.tasks.find(query).sort("created_at", -1)
    tasks = []
    async for t in cursor:
        tasks.append(await _enrich_task(t, db))
    return tasks


# ---------------- List (assigned to me) ----------------
async def list_my_tasks(current_user: dict, status_filter: Optional[str] = None):
    db = get_db()
    query = {"assignee_id": ObjectId(current_user["id"])}
    if status_filter:
        query["status"] = status_filter

    cursor = db.tasks.find(query).sort("due_date", 1)
    tasks = []
    async for t in cursor:
        tasks.append(await _enrich_task(t, db))
    return tasks


# ---------------- Get single ----------------
async def _get_task_or_404(task_id: str, db):
    if not is_valid_objectid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task id")
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


async def _get_user_role_in_project(project_id: ObjectId, user_id: str, db):
    m = await db.project_members.find_one(
        {"project_id": project_id, "user_id": ObjectId(user_id)}
    )
    return m["role"] if m else None


async def get_task(task_id: str, current_user: dict):
    db = get_db()
    task = await _get_task_or_404(task_id, db)

    role = await _get_user_role_in_project(task["project_id"], current_user["id"], db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    return await _enrich_task(task, db)


# ---------------- Update ----------------
async def update_task(task_id: str, payload: TaskUpdate, current_user: dict):
    db = get_db()
    task = await _get_task_or_404(task_id, db)

    role = await _get_user_role_in_project(task["project_id"], current_user["id"], db)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    update_fields = {}
    if payload.title is not None:
        update_fields["title"] = payload.title.strip()
    if payload.description is not None:
        update_fields["description"] = payload.description.strip()
    if payload.status is not None:
        update_fields["status"] = payload.status
    if payload.priority is not None:
        update_fields["priority"] = payload.priority
    if payload.due_date is not None:
        update_fields["due_date"] = payload.due_date
    if payload.assignee_id is not None:
        if payload.assignee_id == "":
            update_fields["assignee_id"] = None
        else:
            await _ensure_assignee_is_member(task["project_id"], payload.assignee_id, db)
            update_fields["assignee_id"] = ObjectId(payload.assignee_id)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.tasks.update_one({"_id": task["_id"]}, {"$set": update_fields})

    updated = await db.tasks.find_one({"_id": task["_id"]})
    return await _enrich_task(updated, db)


# ---------------- Update status ----------------
async def update_task_status(task_id: str, payload: TaskStatusUpdate, current_user: dict):
    db = get_db()
    task = await _get_task_or_404(task_id, db)

    role = await _get_user_role_in_project(task["project_id"], current_user["id"], db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    is_assignee = (
        task.get("assignee_id")
        and str(task["assignee_id"]) == current_user["id"]
    )

    if role != "ADMIN" and not is_assignee:
        raise HTTPException(
            status_code=403,
            detail="Only admins or the assignee can update the status",
        )

    await db.tasks.update_one(
        {"_id": task["_id"]},
        {
            "$set": {
                "status": payload.status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    updated = await db.tasks.find_one({"_id": task["_id"]})
    return await _enrich_task(updated, db)


# ---------------- Delete ----------------
async def delete_task(task_id: str, current_user: dict):
    db = get_db()
    task = await _get_task_or_404(task_id, db)

    role = await _get_user_role_in_project(task["project_id"], current_user["id"], db)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    await db.tasks.delete_one({"_id": task["_id"]})
    return {"message": "Task deleted successfully"}