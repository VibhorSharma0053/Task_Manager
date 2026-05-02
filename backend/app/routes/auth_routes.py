from fastapi import APIRouter, Depends, status

from app.schemas.auth_schema import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.controllers import auth_controller
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest):
    return await auth_controller.signup_user(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    return await auth_controller.login_user(payload)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return await auth_controller.get_me(current_user)