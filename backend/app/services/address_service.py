"""Shared UserAddress creation/default-flip logic.

Used by both `app.routers.addresses` (self-service) and `app.routers.orders`
(admin order entry) so the "first address is always default" / "setting a
new default clears the old one" rules live in exactly one place.
"""

from sqlalchemy.orm import Session

from app.models import User, UserAddress
from app.schemas import AddressInput


def clear_existing_default(db: Session, user: User) -> None:
    db.query(UserAddress).filter(
        UserAddress.UserID == user.UserID, UserAddress.IsDefault == True  # noqa: E712
    ).update({"IsDefault": False})


def create_address(db: Session, user: User, payload: AddressInput) -> UserAddress:
    is_first = (
        db.query(UserAddress).filter(UserAddress.UserID == user.UserID).count() == 0
    )
    is_default = True if is_first else payload.isDefault
    if is_default:
        clear_existing_default(db, user)

    address = UserAddress(
        UserID=user.UserID,
        RecipientName=payload.recipientName,
        RecipientPhone=payload.recipientPhone,
        AddressLine1=payload.addressLine1,
        AddressLine2=payload.addressLine2,
        City=payload.city,
        State=payload.state,
        PinCode=payload.pinCode,
        IsDefault=is_default,
    )
    db.add(address)
    db.flush()
    return address


def apply_update(db: Session, user: User, address: UserAddress, payload: AddressInput) -> None:
    if payload.isDefault and not address.IsDefault:
        clear_existing_default(db, user)

    address.RecipientName = payload.recipientName
    address.RecipientPhone = payload.recipientPhone
    address.AddressLine1 = payload.addressLine1
    address.AddressLine2 = payload.addressLine2
    address.City = payload.city
    address.State = payload.state
    address.PinCode = payload.pinCode
    address.IsDefault = payload.isDefault
