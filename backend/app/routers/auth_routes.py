from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, Token, UserResponse
from app.auth import verify_password, create_access_token, get_current_user, log_audit_event

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        log_audit_event(db, user=creds.username, action="Failed Login Attempt", resource="Auth Gateway", result="Denied", details="Invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    token = create_access_token(data={"sub": user.username, "role": user.role})
    log_audit_event(db, user=user.username, action="User Login", resource="Admin Portal", result="Success")
    
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        full_name=user.full_name
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/switch-persona/{role}", response_model=Token)
def switch_persona(role: str, db: Session = Depends(get_db)):
    """Convenience method for testing RBAC across Super Admin, SOC Admin, SOC Analyst, Viewer"""
    valid_roles = ["Super Admin", "SOC Admin", "SOC Analyst", "Viewer"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    
    user = db.query(User).filter(User.role == role).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that role")

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        full_name=user.full_name
    )
