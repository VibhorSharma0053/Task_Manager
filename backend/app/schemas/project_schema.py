from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Literal


# ---------- Project ----------
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    my_role: str  # ADMIN or MEMBER (current user's role in this project)
    members_count: int
    created_at: datetime
    updated_at: datetime


# ---------- Project Members ----------
class AddMemberRequest(BaseModel):
    email: EmailStr
    role: Literal["ADMIN", "MEMBER"] = "MEMBER"


class UpdateMemberRoleRequest(BaseModel):
    role: Literal["ADMIN", "MEMBER"]


class MemberResponse(BaseModel):
    id: str               # project_member document id
    user_id: str
    name: str
    email: EmailStr
    role: str
    joined_at: datetime