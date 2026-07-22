from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserAddress
from app.schemas import AddressInput, AddressResponse
from app.services import address_service
from app.services.address_mapper import to_response as _to_response

router = APIRouter(prefix="/api/users/me/addresses", tags=["addresses"])


@router.get("", response_model=list[AddressResponse])
def list_addresses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    addresses = (
        db.query(UserAddress)
        .filter(UserAddress.UserID == user.UserID)
        .order_by(UserAddress.IsDefault.desc(), UserAddress.CreatedDate.desc())
        .all()
    )
    return [_to_response(a) for a in addresses]


@router.post("", response_model=AddressResponse, status_code=201)
def create_address(
    payload: AddressInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = address_service.create_address(db, user, payload)
    db.commit()
    db.refresh(address)
    return _to_response(address)


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    payload: AddressInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = db.query(UserAddress).filter(UserAddress.UserAddressID == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.UserID != user.UserID:
        raise HTTPException(status_code=403, detail="Not your address")

    address_service.apply_update(db, user, address, payload)
    db.commit()
    db.refresh(address)
    return _to_response(address)


@router.delete("/{address_id}", status_code=204)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = db.query(UserAddress).filter(UserAddress.UserAddressID == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.UserID != user.UserID:
        raise HTTPException(status_code=403, detail="Not your address")

    db.delete(address)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Cannot delete an address used by an existing order"
        )
