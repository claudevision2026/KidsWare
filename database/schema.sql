-- KidsWare database schema
-- Run this against a local SQL Server instance (Windows Authentication).
-- Usage: sqlcmd -S localhost -E -i schema.sql

IF DB_ID('KidsWare') IS NULL
BEGIN
    CREATE DATABASE KidsWare;
END
GO

USE KidsWare;
GO

-- ============================================================
-- Users
-- ============================================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserID          INT IDENTITY(1,1) PRIMARY KEY,
        PhoneNumber     NVARCHAR(15)  NOT NULL UNIQUE,   -- used as username
        PasswordHash    NVARCHAR(255) NOT NULL,
        Email           NVARCHAR(255) NULL,
        FirstName       NVARCHAR(100) NULL,
        LastName        NVARCHAR(100) NULL,
        TempPassword    NVARCHAR(255) NULL,              -- plaintext, cleared once user sets own password
        Role            NVARCHAR(20)  NOT NULL DEFAULT 'User' CHECK (Role IN ('Admin','User')),
        CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Upgrade blocks for existing dev DBs created before Email became nullable /
-- TempPassword / FirstName / LastName were introduced.
IF COL_LENGTH('dbo.Users', 'TempPassword') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD TempPassword NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH('dbo.Users', 'FirstName') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD FirstName NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.Users', 'LastName') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD LastName NVARCHAR(100) NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'Email' AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.Users ALTER COLUMN Email NVARCHAR(255) NULL;
END
GO

-- ============================================================
-- UserAddress (a user may have several saved shipping addresses)
-- ============================================================
IF OBJECT_ID('dbo.UserAddress', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserAddress (
        UserAddressID   INT IDENTITY(1,1) PRIMARY KEY,
        UserID          INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserID),
        RecipientName   NVARCHAR(200) NULL,
        RecipientPhone  NVARCHAR(15)  NULL,
        AddressLine1    NVARCHAR(255) NOT NULL,
        AddressLine2    NVARCHAR(255) NULL,
        City            NVARCHAR(100) NOT NULL,
        State           NVARCHAR(100) NOT NULL,
        PinCode         NVARCHAR(20)  NOT NULL,
        IsDefault       BIT           NOT NULL DEFAULT 0,
        CreatedDate     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ============================================================
-- Vendors (master/parent table)
-- ============================================================
IF OBJECT_ID('dbo.Vendors', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Vendors (
        VendorID    INT IDENTITY(1,1) PRIMARY KEY,
        VendorName  NVARCHAR(100) NOT NULL,
        Status      NVARCHAR(20)  NOT NULL DEFAULT 'Active'
    );
END
GO

-- ============================================================
-- Model (master/parent table)
-- Note: spec listed the name column as "VendorName" by copy-paste;
-- corrected to ModelName here since this table represents dress models
-- (Lehanga, Kurthi, MomAndDaughter).
-- ============================================================
IF OBJECT_ID('dbo.Model', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Model (
        ModelID    INT IDENTITY(1,1) PRIMARY KEY,
        ModelName  NVARCHAR(100) NOT NULL,
        Status     NVARCHAR(20)  NOT NULL DEFAULT 'Active'
    );
END
GO

-- ============================================================
-- Product
-- ============================================================
IF OBJECT_ID('dbo.Product', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Product (
        ProductID     INT IDENTITY(1,1) PRIMARY KEY,
        VendorID      INT NOT NULL FOREIGN KEY REFERENCES dbo.Vendors(VendorID),
        ProductName   NVARCHAR(200) NOT NULL,
        ModelID       INT NOT NULL FOREIGN KEY REFERENCES dbo.Model(ModelID),
        CreatedDate   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Dispatch      INT NULL,                  -- dispatch time in days
        Description   NVARCHAR(MAX) NULL,        -- HTML content (may include emoji)
        SizeChartURL  NVARCHAR(500) NULL,
        InstaURL      NVARCHAR(500) NULL
    );
END
GO

-- ============================================================
-- ProductPrice (multiple price rows per product, by age group)
-- Note: spec's "StocuCount" corrected to StockCount.
-- ============================================================
IF OBJECT_ID('dbo.ProductPrice', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductPrice (
        ProductPriceID INT IDENTITY(1,1) PRIMARY KEY,
        ProductID      INT NOT NULL FOREIGN KEY REFERENCES dbo.Product(ProductID),
        AgeGroup       NVARCHAR(50) NOT NULL,     -- e.g. "0-3", "3-6"
        Price          DECIMAL(10,2) NOT NULL,
        StockCount     INT NOT NULL DEFAULT 0,
        CreatedDate    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ============================================================
-- ProductImage (multiple dress images per product)
-- ============================================================
IF OBJECT_ID('dbo.ProductImage', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImage (
        ProductImageID INT IDENTITY(1,1) PRIMARY KEY,
        ProductID      INT NOT NULL FOREIGN KEY REFERENCES dbo.Product(ProductID),
        ImageURL       NVARCHAR(500) NOT NULL,
        Status         NCHAR(1) NOT NULL DEFAULT 'Y' CHECK (Status IN ('Y','N'))
    );
END
GO

-- ============================================================
-- Orders (filled in manually by admin for now)
-- Note: spec's "curiousvendors" corrected to CourierVendor.
-- ============================================================
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        OrderID        INT IDENTITY(1,1) PRIMARY KEY,
        ProductID      INT NOT NULL FOREIGN KEY REFERENCES dbo.Product(ProductID),
        PhoneNumber    NVARCHAR(15) NOT NULL,     -- links the order to the buyer
        Age            NVARCHAR(50) NULL,
        Price          DECIMAL(10,2) NULL,
        TransactionID  NVARCHAR(100) NULL,
        PurchaseDate   DATETIME2 NULL,
        VendorID       INT NULL FOREIGN KEY REFERENCES dbo.Vendors(VendorID),
        ModelID        INT NULL FOREIGN KEY REFERENCES dbo.Model(ModelID),
        CourierVendor  NVARCHAR(100) NULL,
        TrackingID     NVARCHAR(100) NULL,
        TrackingURL    NVARCHAR(500) NULL,
        UserAddressID  INT NULL FOREIGN KEY REFERENCES dbo.UserAddress(UserAddressID),
        CreatedDate    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Upgrade block for existing dev DBs created before UserAddress existed.
IF COL_LENGTH('dbo.Orders', 'UserAddressID') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD UserAddressID INT NULL FOREIGN KEY REFERENCES dbo.UserAddress(UserAddressID);
END
GO

IF COL_LENGTH('dbo.Orders', 'Quantity') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD Quantity INT NOT NULL DEFAULT 1;
END
GO

-- ============================================================
-- CartItem (a logged-in user's in-progress shopping basket)
-- Price/ImageURL are snapshots taken at add-time (see specs/07-cart.md)
-- so later admin edits to ProductPrice/ProductImage don't retroactively
-- change what's already sitting in a customer's cart.
-- ============================================================
IF OBJECT_ID('dbo.CartItem', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItem (
        CartItemID   INT IDENTITY(1,1) PRIMARY KEY,
        UserID       INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(UserID),
        ProductID    INT NOT NULL FOREIGN KEY REFERENCES dbo.Product(ProductID),
        AgeGroup     NVARCHAR(50) NOT NULL,
        ImageURL     NVARCHAR(500) NULL,
        Price        DECIMAL(10,2) NOT NULL,
        Quantity     INT NOT NULL DEFAULT 1,
        CreatedDate  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_CartItem_User_Product_Age UNIQUE (UserID, ProductID, AgeGroup)
    );
END
GO
