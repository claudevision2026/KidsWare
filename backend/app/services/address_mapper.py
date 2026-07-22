from app.models import UserAddress
from app.schemas import AddressResponse


def to_response(address: UserAddress) -> AddressResponse:
    return AddressResponse(
        userAddressId=address.UserAddressID,
        userId=address.UserID,
        recipientName=address.RecipientName,
        recipientPhone=address.RecipientPhone,
        addressLine1=address.AddressLine1,
        addressLine2=address.AddressLine2,
        city=address.City,
        state=address.State,
        pinCode=address.PinCode,
        isDefault=address.IsDefault,
        createdDate=address.CreatedDate,
    )
