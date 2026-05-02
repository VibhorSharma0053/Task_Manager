from datetime import datetime, timezone, timedelta
from bson import ObjectId

from app.database import get_db


# ---------------- Helpers ----------------
def _empty_status():
    return {"TODO": 0, "IN_PROGRESS": 0, "DONE": 0}


def _empty_priority():
    return {"LOW": 0, "MEDIUM": 0, "HIGH": 0}


async def _aggregate_status(db, match: dict) -> dict:
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    result = _empty_status()
    async for row in db.tasks.aggregate(pipeline):
        if row["_id"] in result:
            result[row["_id"]] = row["count"]
    return result


async def _aggregate_priority(db, match: dict) -> dict:
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
    ]
    result = _empty_priority()
    async for row in db.tasks.aggregate(pipeline):
        if row["_id"] in result:
            result[row["_id"]] = row["count"]
    return result


async def _count_overdue(db, match: dict) -> int:
    now = datetime.now(timezone.utc)
    query = {**match, "status": {"$ne": "DONE"}, "due_date": {"$lt": now, "$ne": None}}
    return await db.tasks.count_documents(query)


async def _project_name_map(db, project_ids: list) -> dict:
    if not project_ids:
        return {}
    cursor = db.projects.find(
        {"_id": {"$in": project_ids}}, {"name": 1}
    )
    mapping = {}
    async for p in cursor:
        mapping[str(p["_id"])] = p["name"]
    return mapping


async def _user_name_map(db, user_ids: list) -> dict:
    if not user_ids:
        return {}
    cursor = db.users.find(
        {"_id": {"$in": user_ids}}, {"name": 1}
    )
    mapping = {}
    async for u in cursor:
        mapping[str(u["_id"])] = u["name"]
    return mapping


def _to_summary(task: dict, project_map: dict, user_map: dict, now: datetime) -> dict:
    due_date = task.get("due_date")
    is_overdue = False
    if due_date:
        d = due_date if due_date.tzinfo else due_date.replace(tzinfo=timezone.utc)
        is_overdue = d < now and task.get("status") != "DONE"

    pid = str(task["project_id"])
    aid = str(task["assignee_id"]) if task.get("assignee_id") else None

    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "status": task["status"],
        "priority": task["priority"],
        "due_date": due_date,
        "is_overdue": is_overdue,
        "project_id": pid,
        "project_name": project_map.get(pid),
        "assignee_name": user_map.get(aid) if aid else None,
    }


async def _collect_tasks(db, cursor) -> tuple:
    """Collect tasks and gather related project/user ids."""
    tasks = []
    project_ids = set()
    user_ids = set()
    async for t in cursor:
        tasks.append(t)
        project_ids.add(t["project_id"])
        if t.get("assignee_id"):
            user_ids.add(t["assignee_id"])
    return tasks, list(project_ids), list(user_ids)


# ---------------- Global Dashboard ----------------
async def get_global_dashboard(current_user: dict):
    db = get_db()
    user_oid = ObjectId(current_user["id"])
    now = datetime.now(timezone.utc)

    # All project ids the user is a member of
    project_ids = []
    async for m in db.project_members.find({"user_id": user_oid}, {"project_id": 1}):
        project_ids.append(m["project_id"])

    if not project_ids:
        return {
            "projects_count": 0,
            "total_tasks": 0,
            "my_tasks_count": 0,
            "overdue_count": 0,
            "completed_count": 0,
            "status_breakdown": _empty_status(),
            "priority_breakdown": _empty_priority(),
            "recent_tasks": [],
            "upcoming_tasks": [],
        }

    base_match = {"project_id": {"$in": project_ids}}

    # Counts
    total_tasks = await db.tasks.count_documents(base_match)
    my_tasks_count = await db.tasks.count_documents(
        {**base_match, "assignee_id": user_oid}
    )
    completed_count = await db.tasks.count_documents(
        {**base_match, "status": "DONE"}
    )
    overdue_count = await _count_overdue(db, base_match)

    status_breakdown = await _aggregate_status(db, base_match)
    priority_breakdown = await _aggregate_priority(db, base_match)

    # Recent tasks (last 5 created)
    recent_cursor = db.tasks.find(base_match).sort("created_at", -1).limit(5)
    recent_tasks_raw, p_ids_r, u_ids_r = await _collect_tasks(db, recent_cursor)

    # Upcoming tasks (due in next 7 days, not done) — top 5
    in_seven_days = now + timedelta(days=7)
    upcoming_cursor = (
        db.tasks.find(
            {
                **base_match,
                "status": {"$ne": "DONE"},
                "due_date": {"$gte": now, "$lte": in_seven_days},
            }
        )
        .sort("due_date", 1)
        .limit(5)
    )
    upcoming_tasks_raw, p_ids_u, u_ids_u = await _collect_tasks(db, upcoming_cursor)

    project_map = await _project_name_map(
        db, list(set(p_ids_r + p_ids_u))
    )
    user_map = await _user_name_map(db, list(set(u_ids_r + u_ids_u)))

    recent_tasks = [_to_summary(t, project_map, user_map, now) for t in recent_tasks_raw]
    upcoming_tasks = [_to_summary(t, project_map, user_map, now) for t in upcoming_tasks_raw]

    return {
        "projects_count": len(project_ids),
        "total_tasks": total_tasks,
        "my_tasks_count": my_tasks_count,
        "overdue_count": overdue_count,
        "completed_count": completed_count,
        "status_breakdown": status_breakdown,
        "priority_breakdown": priority_breakdown,
        "recent_tasks": recent_tasks,
        "upcoming_tasks": upcoming_tasks,
    }


# ---------------- Project Dashboard ----------------
async def get_project_dashboard(context: dict):
    db = get_db()
    project = context["project"]
    now = datetime.now(timezone.utc)

    base_match = {"project_id": project["_id"]}

    members_count = await db.project_members.count_documents(
        {"project_id": project["_id"]}
    )
    total_tasks = await db.tasks.count_documents(base_match)
    completed_count = await db.tasks.count_documents(
        {**base_match, "status": "DONE"}
    )
    overdue_count = await _count_overdue(db, base_match)

    status_breakdown = await _aggregate_status(db, base_match)
    priority_breakdown = await _aggregate_priority(db, base_match)

    recent_cursor = db.tasks.find(base_match).sort("created_at", -1).limit(5)
    recent_tasks_raw, p_ids_r, u_ids_r = await _collect_tasks(db, recent_cursor)

    in_seven_days = now + timedelta(days=7)
    upcoming_cursor = (
        db.tasks.find(
            {
                **base_match,
                "status": {"$ne": "DONE"},
                "due_date": {"$gte": now, "$lte": in_seven_days},
            }
        )
        .sort("due_date", 1)
        .limit(5)
    )
    upcoming_tasks_raw, p_ids_u, u_ids_u = await _collect_tasks(db, upcoming_cursor)

    project_map = {str(project["_id"]): project["name"]}
    user_map = await _user_name_map(db, list(set(u_ids_r + u_ids_u)))

    recent_tasks = [_to_summary(t, project_map, user_map, now) for t in recent_tasks_raw]
    upcoming_tasks = [_to_summary(t, project_map, user_map, now) for t in upcoming_tasks_raw]

    return {
        "project_id": str(project["_id"]),
        "project_name": project["name"],
        "members_count": members_count,
        "total_tasks": total_tasks,
        "overdue_count": overdue_count,
        "completed_count": completed_count,
        "status_breakdown": status_breakdown,
        "priority_breakdown": priority_breakdown,
        "recent_tasks": recent_tasks,
        "upcoming_tasks": upcoming_tasks,
    }