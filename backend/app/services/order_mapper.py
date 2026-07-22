from app.models import Order
from app.schemas import OrderResponse
from app.services.address_mapper import to_response as _address_to_response


def to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        orderId=order.OrderID,
        productId=order.ProductID,
        productName=order.product.ProductName,
        phoneNumber=order.PhoneNumber,
        age=order.Age,
        price=float(order.Price) if order.Price is not None else None,
        transactionId=order.TransactionID,
        purchaseDate=order.PurchaseDate,
        vendorId=order.VendorID,
        modelId=order.ModelID,
        courierVendor=order.CourierVendor,
        trackingId=order.TrackingID,
        trackingUrl=order.TrackingURL,
        createdDate=order.CreatedDate,
        userAddressId=order.UserAddressID,
        address=_address_to_response(order.address) if order.address is not None else None,
    )
