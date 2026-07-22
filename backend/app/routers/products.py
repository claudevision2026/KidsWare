from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Product
from app.schemas import (
    ProductDetailResponse,
    ProductGridResponse,
    ProductPriceResponse,
    TranslatedDescriptionResponse,
)
from app.services.product_mapper import to_detail as _to_detail
from app.services.translation_service import translate_html

router = APIRouter(prefix="/api/products", tags=["storefront"])

SUPPORTED_DESCRIPTION_LANGS = {"te", "ta", "hi"}


@router.get("/latest", response_model=list[ProductGridResponse])
def latest_products(db: Session = Depends(get_db)):
    products = (
        db.query(Product)
        .options(
            joinedload(Product.vendor),
            joinedload(Product.model_ref),
            joinedload(Product.images),
            joinedload(Product.prices),
        )
        .order_by(Product.CreatedDate.desc())
        .limit(24)
        .all()
    )
    result = []
    for p in products:
        active_images = [i for i in p.images if i.Status == "Y"]
        result.append(
            ProductGridResponse(
                productId=p.ProductID,
                productName=p.ProductName,
                vendorName=p.vendor.VendorName,
                modelName=p.model_ref.ModelName,
                thumbnailUrl=active_images[0].ImageURL if active_images else None,
                sizeChartUrl=p.SizeChartURL,
                images=[i.ImageURL for i in active_images],
                prices=[
                    ProductPriceResponse(
                        productPriceId=pr.ProductPriceID,
                        ageGroup=pr.AgeGroup,
                        price=float(pr.Price),
                        stockCount=pr.StockCount,
                    )
                    for pr in p.prices
                ],
            )
        )
    return result


@router.get("/{product_id}", response_model=ProductDetailResponse)
def product_details(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.vendor), joinedload(Product.model_ref),
            joinedload(Product.prices), joinedload(Product.images),
        )
        .filter(Product.ProductID == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_detail(product)


@router.get("/{product_id}/description", response_model=TranslatedDescriptionResponse)
async def translated_description(product_id: int, lang: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if lang not in SUPPORTED_DESCRIPTION_LANGS or not product.Description:
        return TranslatedDescriptionResponse(description=product.Description or "", translated=False)

    try:
        translated = await translate_html(product.Description, lang)
        return TranslatedDescriptionResponse(description=translated, translated=True)
    except Exception:
        return TranslatedDescriptionResponse(description=product.Description, translated=False)
