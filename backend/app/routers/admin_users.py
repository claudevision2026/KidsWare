from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Order, User
from app.schemas import AdminUserResponse

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


@router.get("", response_model=list[AdminUserResponse])
def list_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    users = db.query(User).order_by(User.CreatedDate.desc()).all()
    phones_with_orders = {row[0] for row in db.query(Order.PhoneNumber).distinct().all()}
    return [
        AdminUserResponse(
            userId=u.UserID,
            phoneNumber=u.PhoneNumber,
            email=u.Email,
            firstName=u.FirstName,
            lastName=u.LastName,
            role=u.Role,
            createdDate=u.CreatedDate,
            tempPassword=u.TempPassword,
            hasOrders=u.PhoneNumber in phones_with_orders,
        )
        for u in users
    ]
