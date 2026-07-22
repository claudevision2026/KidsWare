"""Public shipping-info capture, used by the storefront's How to Buy page before any order exists.

No order is created here — the admin still adds the actual Order later (see
backend/app/routers/orders.py::create_order) once payment is confirmed via WhatsApp. This just
pre-saves the customer's phone/address so that step already finds the account and address ready.

Deliberately never returns existing address/email data: unlike the admin-only lookup-user
endpoint, this is reachable by anonymous visitors, so leaking another account's saved address to
whoever happens to type in that phone number would be a real privacy problem.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import generate_temp_password, hash_password
from app.database import get_db
from app.models import User
from app.schemas import CaptureShippingRequest, CaptureShippingResponse
from app.services import address_service

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


@router.post("/capture-shipping", response_model=CaptureShippingResponse, status_code=201)
def capture_shipping(payload: CaptureShippingRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.PhoneNumber == payload.phoneNumber).first()
    new_user_created = False
    temp_password: str | None = None

    if not user:
        temp_password = generate_temp_password()
        user = User(
            PhoneNumber=payload.phoneNumber,
            PasswordHash=hash_password(temp_password),
            Email=None,
            TempPassword=temp_password,
            Role="User",
        )
        db.add(user)
        db.flush()
        new_user_created = True

    address_service.create_address(db, user, payload.newAddress)
    db.commit()

    return CaptureShippingResponse(
        newUserCreated=new_user_created,
        tempPassword=temp_password if new_user_created else None,
    )
