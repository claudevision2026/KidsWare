from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import generate_temp_password, get_current_user, hash_password, require_admin
from app.database import get_db
from app.models import Order, Product, User, UserAddress
from app.schemas import (
    OrderCreateRequest,
    OrderCreateResponse,
    OrderGroupResponse,
    OrderResponse,
    OrderUpdateRequest,
    UserLookupResponse,
)
from app.services import address_service
from app.services.address_mapper import to_response as _address_to_response
from app.services.order_mapper import to_grouped_response as _to_grouped_response
from app.services.order_mapper import to_response as _to_response

router = APIRouter(prefix="/api/orders", tags=["orders"])
admin_router = APIRouter(prefix="/api/admin/orders", tags=["admin-orders"])


@router.get("/my", response_model=list[OrderGroupResponse])
def my_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .options(joinedload(Order.product), joinedload(Order.address))
        .filter(Order.PhoneNumber == user.PhoneNumber)
        .order_by(Order.CreatedDate.desc())
        .all()
    )
    return _to_grouped_response(orders)


@admin_router.get("/lookup-user", response_model=UserLookupResponse)
def lookup_user(
    phoneNumber: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.PhoneNumber == phoneNumber).first()
    if not user:
        return UserLookupResponse(exists=False, phoneNumber=phoneNumber)

    addresses = (
        db.query(UserAddress)
        .filter(UserAddress.UserID == user.UserID)
        .order_by(UserAddress.IsDefault.desc(), UserAddress.CreatedDate.desc())
        .all()
    )
    return UserLookupResponse(
        exists=True,
        phoneNumber=user.PhoneNumber,
        userId=user.UserID,
        email=user.Email,
        firstName=user.FirstName,
        lastName=user.LastName,
        addresses=[_address_to_response(a) for a in addresses],
    )


@admin_router.get("", response_model=list[OrderResponse])
def list_all_orders(
    phoneNumber: str | None = None,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    query = db.query(Order).options(joinedload(Order.product), joinedload(Order.address))
    if phoneNumber:
        query = query.filter(Order.PhoneNumber == phoneNumber)
    orders = query.order_by(Order.CreatedDate.desc()).all()
    return [_to_response(o) for o in orders]


def _resolve_address(
    db: Session,
    user: User,
    payload: OrderCreateRequest | OrderUpdateRequest,
) -> int | None:
    """Validate/resolve `userAddressId` or `newAddress` on an order payload.

    Returns the `UserAddressID` to store on the order, or `None` if neither
    was supplied.
    """
    if payload.userAddressId is not None and payload.newAddress is not None:
        raise HTTPException(
            status_code=400, detail="Provide either userAddressId or newAddress, not both"
        )

    if payload.userAddressId is not None:
        address = (
            db.query(UserAddress)
            .filter(UserAddress.UserAddressID == payload.userAddressId)
            .first()
        )
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
        if address.UserID != user.UserID:
            raise HTTPException(status_code=403, detail="Address does not belong to this user")
        return address.UserAddressID

    if payload.newAddress is not None:
        address = address_service.create_address(db, user, payload.newAddress)
        return address.UserAddressID

    return None


@admin_router.post("", response_model=OrderCreateResponse, status_code=201)
def create_order(
    payload: OrderCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.ProductID == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    user = db.query(User).filter(User.PhoneNumber == payload.phoneNumber).first()
    new_user_created = False
    temp_password: str | None = None
    if not user:
        temp_password = generate_temp_password()
        user = User(
            PhoneNumber=payload.phoneNumber,
            PasswordHash=hash_password(temp_password),
            Email=None,
            FirstName=payload.customerFirstName,
            LastName=payload.customerLastName,
            TempPassword=temp_password,
            Role="User",
        )
        db.add(user)
        db.flush()
        new_user_created = True
    elif payload.customerFirstName is not None or payload.customerLastName is not None:
        user.FirstName = payload.customerFirstName
        user.LastName = payload.customerLastName

    user_address_id = _resolve_address(db, user, payload)

    order = Order(
        ProductID=payload.productId,
        PhoneNumber=payload.phoneNumber,
        Age=payload.age,
        Price=payload.price,
        TransactionID=payload.transactionId,
        PurchaseDate=payload.purchaseDate,
        VendorID=payload.vendorId,
        ModelID=payload.modelId,
        CourierVendor=payload.courierVendor,
        TrackingID=payload.trackingId,
        TrackingURL=payload.trackingUrl,
        UserAddressID=user_address_id,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return OrderCreateResponse(
        order=_to_response(order),
        newUserCreated=new_user_created,
        tempPassword=temp_password if new_user_created else None,
    )


@admin_router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    payload: OrderUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    order = db.query(Order).filter(Order.OrderID == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    user = db.query(User).filter(User.PhoneNumber == payload.phoneNumber).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="No account exists for this phone number; use the order create flow instead",
        )

    if payload.customerFirstName is not None or payload.customerLastName is not None:
        user.FirstName = payload.customerFirstName
        user.LastName = payload.customerLastName

    user_address_id = _resolve_address(db, user, payload)

    order.ProductID = payload.productId
    order.PhoneNumber = payload.phoneNumber
    order.Age = payload.age
    order.Price = payload.price
    order.TransactionID = payload.transactionId
    order.PurchaseDate = payload.purchaseDate
    order.VendorID = payload.vendorId
    order.ModelID = payload.modelId
    order.CourierVendor = payload.courierVendor
    order.TrackingID = payload.trackingId
    order.TrackingURL = payload.trackingUrl
    if user_address_id is not None:
        order.UserAddressID = user_address_id
    db.commit()
    db.refresh(order)
    return _to_response(order)
