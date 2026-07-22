from app.models import Product
from app.schemas import ProductDetailResponse, ProductImageResponse, ProductPriceResponse


def to_detail(product: Product) -> ProductDetailResponse:
    return ProductDetailResponse(
        productId=product.ProductID,
        productName=product.ProductName,
        vendorId=product.VendorID,
        vendorName=product.vendor.VendorName,
        modelId=product.ModelID,
        modelName=product.model_ref.ModelName,
        description=product.Description,
        dispatch=product.Dispatch,
        sizeChartUrl=product.SizeChartURL,
        instaUrl=product.InstaURL,
        createdDate=product.CreatedDate,
        prices=[
            ProductPriceResponse(
                productPriceId=p.ProductPriceID,
                ageGroup=p.AgeGroup,
                price=float(p.Price),
                stockCount=p.StockCount,
            )
            for p in product.prices
        ],
        images=[
            ProductImageResponse(
                productImageId=i.ProductImageID, imageUrl=i.ImageURL, status=i.Status
            )
            for i in product.images
            if i.Status == "Y"
        ],
    )
