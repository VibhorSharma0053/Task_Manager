from fastapi import HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId

from app.database import get_db
from app.schemas.auth_schema import SignupRequest, LoginRequest
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token


async def signup_user(payload: SignupRequest):
    db = get_db()

    # Check if email already exists
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate token
    token = create_access_token({"sub": user_id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user_doc["name"],
            "email": user_doc["email"],
            "created_at": user_doc["created_at"],
        },
    }


async def login_user(payload: LoginRequest):
    db = get_db()

    user = await db.users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "created_at": user["created_at"],
        },
    }


async def get_me(current_user: dict):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
    }
