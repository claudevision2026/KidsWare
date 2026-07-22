import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    phoneNumber: str = Field(min_length=7, max_length=15)
    password: str = Field(min_length=6)
    confirmPassword: str
    email: EmailStr

    @field_validator("confirmPassword")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    phoneNumber: str
    password: str


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    role: str
    phoneNumber: str


class MeResponse(BaseModel):
    userId: int
    phoneNumber: str
    email: str | None
    firstName: str | None
    lastName: str | None
    role: str


class UpdateNameRequest(BaseModel):
    firstName: str = Field(min_length=1, max_length=100)
    lastName: str = Field(min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)
    confirmNewPassword: str

    @field_validator("confirmNewPassword")
    @classmethod
    def passwords_match(cls, v, info):
        if "newPassword" in info.data and v != info.data["newPassword"]:
            raise ValueError("Passwords do not match")
        return v


# ---------- Addresses ----------
class AddressInput(BaseModel):
    recipientName: str | None = None
    recipientPhone: str | None = None
    addressLine1: str
    addressLine2: str | None = None
    city: str
    state: str
    pinCode: str
    isDefault: bool = False


class AddressResponse(BaseModel):
    userAddressId: int
    userId: int
    recipientName: str | None
    recipientPhone: str | None
    addressLine1: str
    addressLine2: str | None
    city: str
    state: str
    pinCode: str
    isDefault: bool
    createdDate: datetime.datetime


class UserLookupResponse(BaseModel):
    exists: bool
    phoneNumber: str
    userId: int | None = None
    email: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    addresses: list[AddressResponse] = []


# ---------- Checkout (guest shipping capture, no order yet) ----------
class CaptureShippingRequest(BaseModel):
    phoneNumber: str = Field(min_length=7, max_length=15)
    newAddress: AddressInput


class CaptureShippingResponse(BaseModel):
    newUserCreated: bool
    tempPassword: str | None = None


class AdminUserResponse(BaseModel):
    userId: int
    phoneNumber: str
    email: str | None
    firstName: str | None
    lastName: str | None
    role: str
    createdDate: datetime.datetime
    tempPassword: str | None
    hasOrders: bool


# ---------- Reference data ----------
class VendorResponse(BaseModel):
    vendorId: int
    vendorName: str
    status: str

    class Config:
        from_attributes = True


class ModelResponse(BaseModel):
    modelId: int
    modelName: str
    status: str

    class Config:
        from_attributes = True


# ---------- Product ----------
class ProductPriceInput(BaseModel):
    ageGroup: str
    price: float
    stockCount: int = 0


class ProductPriceResponse(BaseModel):
    productPriceId: int
    ageGroup: str
    price: float
    stockCount: int

    class Config:
        from_attributes = True


class ProductImageResponse(BaseModel):
    productImageId: int
    imageUrl: str
    status: str

    class Config:
        from_attributes = True


class ProductGridResponse(BaseModel):
    productId: int
    productName: str
    vendorName: str
    modelName: str
    thumbnailUrl: str | None
    sizeChartUrl: str | None
    prices: list[ProductPriceResponse] = []
    images: list[str] = []


class ProductDetailResponse(BaseModel):
    productId: int
    productName: str
    vendorId: int
    vendorName: str
    modelId: int
    modelName: str
    description: str | None
    dispatch: int | None
    sizeChartUrl: str | None
    instaUrl: str | None
    createdDate: datetime.datetime
    prices: list[ProductPriceResponse]
    images: list[ProductImageResponse]


class TranslatedDescriptionResponse(BaseModel):
    description: str
    translated: bool


class ProductUpdateRequest(BaseModel):
    productName: str
    vendorId: int
    modelId: int
    description: str | None = None
    dispatch: int | None = None
    instaUrl: str | None = None


# ---------- Orders ----------
class OrderCreateRequest(BaseModel):
    productId: int
    phoneNumber: str
    customerFirstName: str | None = None
    customerLastName: str | None = None
    age: str | None = None
    price: float | None = None
    transactionId: str | None = None
    purchaseDate: datetime.datetime | None = None
    vendorId: int | None = None
    modelId: int | None = None
    courierVendor: str | None = None
    trackingId: str | None = None
    trackingUrl: str | None = None
    userAddressId: int | None = None
    newAddress: AddressInput | None = None

    @field_validator("newAddress")
    @classmethod
    def address_mutually_exclusive(cls, v, info):
        if v is not None and info.data.get("userAddressId") is not None:
            raise ValueError("Provide either userAddressId or newAddress, not both")
        return v


class OrderUpdateRequest(OrderCreateRequest):
    pass


class OrderResponse(BaseModel):
    orderId: int
    productId: int
    productName: str
    phoneNumber: str
    age: str | None
    price: float | None
    transactionId: str | None
    purchaseDate: datetime.datetime | None
    vendorId: int | None
    modelId: int | None
    courierVendor: str | None
    trackingId: str | None
    trackingUrl: str | None
    createdDate: datetime.datetime
    userAddressId: int | None
    address: AddressResponse | None


class OrderCreateResponse(BaseModel):
    order: OrderResponse
    newUserCreated: bool
    tempPassword: str | None = None


# ---------- Payments ----------
class CreatePaymentOrderRequest(BaseModel):
    productId: int
    ageGroup: str


class CreatePaymentOrderResponse(BaseModel):
    razorpayOrderId: str
    amount: int
    currency: str
    keyId: str
    productId: int
    ageGroup: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    productId: int
    ageGroup: str
    price: float
