"""
Authentication: bcrypt password hashing + JWT bearer tokens + role guards.

Phase 2 changes:
  * Migrated from server-side sessions to JWT (RFC 7519) bearer tokens.
  * Login is by **email**, not username.
  * Token signed with HS256 using SESSION_SECRET (env var).
  * Stateless — no cookie / session middleware needed.

Frontend stores the token (typically in localStorage) and sends it as
`Authorization: Bearer <token>` on every API call.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import jwt  # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from database import get_db

# ---------- Password hashing ----------
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_ctx.verify(plain, hashed)
    except Exception:
        return False


# ---------- JWT ----------
SECRET_KEY = os.getenv("SESSION_SECRET", "dev-secret-please-change")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24h

# OAuth2 helper — auto_error=False so we can return our own 401s.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def create_access_token(user: "models.User", expires_minutes: Optional[int] = None) -> str:
    exp_minutes = expires_minutes if expires_minutes is not None else ACCESS_TOKEN_EXPIRE_MINUTES
    payload = {
        "sub": str(user.user_id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=exp_minutes),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_exc
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        raise cred_exc
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user or not user.is_active:
        raise cred_exc
    return user


def require_roles(*allowed: str):
    allowed_set = set(allowed)

    def _checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(sorted(allowed_set))}",
            )
        return user

    return _checker


require_admin = require_roles("admin")
require_staff = require_roles("admin", "librarian")
require_any = require_roles("admin", "librarian", "student")


# ---------- Seeding ----------
SEED_USERS = [
    {
        "email": "admin@gmail.com",
        "username": "admin",
        "full_name": "System Administrator",
        "password": "85Singh85@",
        "role": "admin",
    },
    {
        "email": "librarian@gmail.com",
        "username": "librarian",
        "full_name": "Library Staff",
        "password": "85Singh85@",
        "role": "librarian",
    },
    {
        "email": "user@gmail.com",
        "username": "user",
        "full_name": "Library Member",
        "password": "85Singh85@",
        "role": "student",
    },
]


def seed_default_users(db: Session) -> None:
    """Ensure the three demo accounts exist with their canonical credentials.

    Idempotent: if a user with the email exists, we leave it alone unless its
    password hash is missing (rare). Re-running won't duplicate or corrupt
    data.
    """
    for spec in SEED_USERS:
        existing = db.query(models.User).filter(models.User.email == spec["email"]).first()
        if existing:
            # Refresh password hash on every startup so a stale/broken hash
            # (e.g. created with an incompatible bcrypt version) is healed.
            existing.password_hash = hash_password(spec["password"])
            existing.role = spec["role"]
            existing.is_active = True
            continue
        user = models.User(
            email=spec["email"],
            username=spec["username"],
            full_name=spec["full_name"],
            password_hash=hash_password(spec["password"]),
            role=spec["role"],
            is_active=True,
        )
        db.add(user)
    db.commit()
