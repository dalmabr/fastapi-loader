import os
import httpx
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

SUPABASE_URL = "https://kfxumwkoxqcwbziolluj.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "operator"

async def verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")

    token = authorization.replace("Bearer ", "")

    # Verify token and check if user is admin
    async with httpx.AsyncClient() as client:
        # Get user info from token
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY}
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = resp.json()
    role = user.get("app_metadata", {}).get("role")

    if role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")

    return user

@router.post("/users")
async def create_user(req: CreateUserRequest, _=Depends(verify_admin)):
    if not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="SUPABASE_SERVICE_ROLE_KEY não configurada")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            json={
                "email": req.email,
                "password": req.password,
                "email_confirm": True,
                "app_metadata": {"role": req.role},
            },
            headers={"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}", "apikey": SUPABASE_SERVICE_KEY}
        )

        if resp.status_code not in (200, 201):
            err = resp.json()
            raise HTTPException(status_code=400, detail=err.get("message", "Erro ao criar usuário"))

    user_data = resp.json()
    user_id = user_data["id"]

    # Update role if not operator
    if req.role != "operator":
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/profiles",
                params={"id": f"eq.{user_id}"},
                json={"role": req.role},
                headers={"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}", "apikey": SUPABASE_SERVICE_KEY}
            )

    return {"id": user_id, "email": req.email, "role": req.role}
