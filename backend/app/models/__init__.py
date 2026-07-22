import datetime

from sqlalchemy import (
    CHAR,
    DECIMAL,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Unicode,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "Users"

    UserID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    PhoneNumber: Mapped[str] = mapped_column(Unicode(15), unique=True, nullable=False)
    PasswordHash: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    Email: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    FirstName: Mapped[str | None] = mapped_column(Unicode(100), nullable=True)
    LastName: Mapped[str | None] = mapped_column(Unicode(100), nullable=True)
    TempPassword: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    Role: Mapped[str] = mapped_column(Unicode(20), nullable=False, default="User")
    CreatedDate: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    addresses: Mapped[list["UserAddress"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserAddress(Base):
    __tablename__ = "UserAddress"

    UserAddressID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    UserID: Mapped[int] = mapped_column(ForeignKey("Users.UserID"), nullable=False)
    RecipientName: Mapped[str | None] = mapped_column(Unicode(200), nullable=True)
    RecipientPhone: Mapped[str | None] = mapped_column(Unicode(15), nullable=True)
    AddressLine1: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    AddressLine2: Mapped[str | None] = mapped_column(Unicode(255), nullable=True)
    City: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    State: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    PinCode: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    IsDefault: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    CreatedDate: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="addresses")


class Vendor(Base):
    __tablename__ = "Vendors"

    VendorID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    VendorName: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    Status: Mapped[str] = mapped_column(Unicode(20), nullable=False, default="Active")


class Model(Base):
    __tablename__ = "Model"

    ModelID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ModelName: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    Status: Mapped[str] = mapped_column(Unicode(20), nullable=False, default="Active")


class Product(Base):
    __tablename__ = "Product"

    ProductID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    VendorID: Mapped[int] = mapped_column(ForeignKey("Vendors.VendorID"), nullable=False)
    ProductName: Mapped[str] = mapped_column(Unicode(200), nullable=False)
    ModelID: Mapped[int] = mapped_column(ForeignKey("Model.ModelID"), nullable=False)
    CreatedDate: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    Dispatch: Mapped[int | None] = mapped_column(Integer, nullable=True)
    Description: Mapped[str | None] = mapped_column(Unicode(None), nullable=True)
    SizeChartURL: Mapped[str | None] = mapped_column(Unicode(500), nullable=True)
    InstaURL: Mapped[str | None] = mapped_column(Unicode(500), nullable=True)

    vendor: Mapped["Vendor"] = relationship()
    model_ref: Mapped["Model"] = relationship()
    prices: Mapped[list["ProductPrice"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class ProductPrice(Base):
    __tablename__ = "ProductPrice"

    ProductPriceID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProductID: Mapped[int] = mapped_column(ForeignKey("Product.ProductID"), nullable=False)
    AgeGroup: Mapped[str] = mapped_column(Unicode(50), nullable=False)
    Price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    StockCount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    CreatedDate: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    product: Mapped["Product"] = relationship(back_populates="prices")


class ProductImage(Base):
    __tablename__ = "ProductImage"

    ProductImageID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProductID: Mapped[int] = mapped_column(ForeignKey("Product.ProductID"), nullable=False)
    ImageURL: Mapped[str] = mapped_column(Unicode(500), nullable=False)
    Status: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="Y")

    product: Mapped["Product"] = relationship(back_populates="images")


class Order(Base):
    __tablename__ = "Orders"

    OrderID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ProductID: Mapped[int] = mapped_column(ForeignKey("Product.ProductID"), nullable=False)
    PhoneNumber: Mapped[str] = mapped_column(Unicode(15), nullable=False)
    Age: Mapped[str | None] = mapped_column(Unicode(50), nullable=True)
    Price: Mapped[float | None] = mapped_column(DECIMAL(10, 2), nullable=True)
    TransactionID: Mapped[str | None] = mapped_column(Unicode(100), nullable=True)
    PurchaseDate: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    VendorID: Mapped[int | None] = mapped_column(ForeignKey("Vendors.VendorID"), nullable=True)
    ModelID: Mapped[int | None] = mapped_column(ForeignKey("Model.ModelID"), nullable=True)
    CourierVendor: Mapped[str | None] = mapped_column(Unicode(100), nullable=True)
    TrackingID: Mapped[str | None] = mapped_column(Unicode(100), nullable=True)
    TrackingURL: Mapped[str | None] = mapped_column(Unicode(500), nullable=True)
    UserAddressID: Mapped[int | None] = mapped_column(
        ForeignKey("UserAddress.UserAddressID"), nullable=True
    )
    CreatedDate: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    product: Mapped["Product"] = relationship()
    address: Mapped["UserAddress | None"] = relationship()
