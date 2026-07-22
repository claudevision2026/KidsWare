from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
    UpdateNameRequest,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.PhoneNumber == payload.phoneNumber).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        PhoneNumber=payload.phoneNumber,
        PasswordHash=hash_password(payload.password),
        Email=payload.email,
        Role="User",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Phone number already registered")
    db.refresh(user)

    token = create_access_token(phone_number=user.PhoneNumber, role=user.Role, user_id=user.UserID)
    return TokenResponse(accessToken=token, role=user.Role, phoneNumber=user.PhoneNumber)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.PhoneNumber == payload.phoneNumber).first()
    if not user or not verify_password(payload.password, user.PasswordHash):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")

    token = create_access_token(phone_number=user.PhoneNumber, role=user.Role, user_id=user.UserID)
    return TokenResponse(accessToken=token, role=user.Role, phoneNumber=user.PhoneNumber)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return MeResponse(
        userId=user.UserID,
        phoneNumber=user.PhoneNumber,
        email=user.Email,
        firstName=user.FirstName,
        lastName=user.LastName,
        role=user.Role,
    )


@router.put("/me", response_model=MeResponse)
def update_me(
    payload: UpdateNameRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.FirstName = payload.firstName
    user.LastName = payload.lastName
    db.commit()
    return MeResponse(
        userId=user.UserID,
        phoneNumber=user.PhoneNumber,
        email=user.Email,
        firstName=user.FirstName,
        lastName=user.LastName,
        role=user.Role,
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.currentPassword, user.PasswordHash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.PasswordHash = hash_password(payload.newPassword)
    user.TempPassword = None
    db.commit()
