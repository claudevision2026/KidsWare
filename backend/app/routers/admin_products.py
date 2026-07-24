import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.auth import require_admin
from app.config import settings
from app.database import get_db
from app.models import Product, ProductImage, ProductPrice
from app.schemas import (
    ProductDetailResponse,
    ProductPriceInput,
    ProductPriceResponse,
    ProductUpdateRequest,
)
from app.services.file_storage import save_upload
from app.services.product_mapper import to_detail as _to_detail

router = APIRouter(prefix="/api/admin/products", tags=["admin-products"])


@router.post("", response_model=ProductDetailResponse, status_code=201)
def create_product(
    productName: str = Form(...),
    vendorId: int = Form(...),
    modelId: int = Form(...),
    description: str = Form(""),
    dispatch: int | None = Form(None),
    instaUrl: str = Form(""),
    prices: str = Form(...),  # JSON list of {ageGroup, price, stockCount}
    sizechart: UploadFile = File(...),
    dressImages: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    try:
        price_rows = [ProductPriceInput(**row) for row in json.loads(prices)]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid prices payload: {exc}")

    if not price_rows:
        raise HTTPException(status_code=400, detail="At least one price row is required")
    if not dressImages:
        raise HTTPException(status_code=400, detail="At least one dress image is required")

    sizechart_url = save_upload(sizechart, settings.sizechart_dir)

    product = Product(
        VendorID=vendorId,
        ProductName=productName,
        ModelID=modelId,
        Dispatch=dispatch,
        Description=description,
        SizeChartURL=sizechart_url,
        InstaURL=instaUrl,
    )
    db.add(product)
    db.flush()

    for row in price_rows:
        db.add(
            ProductPrice(
                ProductID=product.ProductID,
                AgeGroup=row.ageGroup,
                Price=row.price,
                StockCount=row.stockCount,
            )
        )

    for image_file in dressImages:
        image_url = save_upload(image_file, settings.dress_images_dir)
        db.add(ProductImage(ProductID=product.ProductID, ImageURL=image_url, Status="Y"))

    db.commit()
    db.refresh(product)
    return _to_detail(product)


@router.get("")
def list_products(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    products = (
        db.query(Product)
        .options(joinedload(Product.vendor), joinedload(Product.model_ref), joinedload(Product.images))
        .order_by(Product.CreatedDate.desc())
        .all()
    )
    result = []
    for p in products:
        active_images = [i for i in p.images if i.Status == "Y"]
        result.append(
            {
                "productId": p.ProductID,
                "productName": p.ProductName,
                "vendorName": p.vendor.VendorName,
                "modelName": p.model_ref.ModelName,
                "thumbnailUrl": active_images[0].ImageURL if active_images else None,
                "sizeChartUrl": p.SizeChartURL,
            }
        )
    return result


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(product_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    product = db.query(Product).options(
        joinedload(Product.vendor), joinedload(Product.model_ref),
        joinedload(Product.prices), joinedload(Product.images),
    ).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_detail(product)


@router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.ProductName = payload.productName
    product.VendorID = payload.vendorId
    product.ModelID = payload.modelId
    product.Description = payload.description
    product.Dispatch = payload.dispatch
    product.InstaURL = payload.instaUrl
    db.commit()
    db.refresh(product)
    return _to_detail(product)


@router.put("/{product_id}/sizechart", response_model=ProductDetailResponse)
def replace_sizechart(
    product_id: int,
    sizechart: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.SizeChartURL = save_upload(sizechart, settings.sizechart_dir)
    db.commit()
    db.refresh(product)
    return _to_detail(product)


@router.post("/{product_id}/images", response_model=ProductDetailResponse)
def add_images(
    product_id: int,
    dressImages: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for image_file in dressImages:
        image_url = save_upload(image_file, settings.dress_images_dir)
        db.add(ProductImage(ProductID=product.ProductID, ImageURL=image_url, Status="Y"))

    db.commit()
    db.refresh(product)
    return _to_detail(product)


@router.patch("/images/{image_id}/status")
def set_image_status(
    image_id: int,
    status: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if status not in ("Y", "N"):
        raise HTTPException(status_code=400, detail="status must be Y or N")
    image = db.query(ProductImage).filter(ProductImage.ProductImageID == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    image.Status = status
    db.commit()
    return {"productImageId": image_id, "status": status}


@router.post("/{product_id}/prices", response_model=ProductPriceResponse, status_code=201)
def add_price(
    product_id: int,
    payload: ProductPriceInput,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.ProductID == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    price = ProductPrice(
        ProductID=product_id, AgeGroup=payload.ageGroup, Price=payload.price, StockCount=payload.stockCount
    )
    db.add(price)
    db.commit()
    db.refresh(price)
    return ProductPriceResponse(
        productPriceId=price.ProductPriceID,
        ageGroup=price.AgeGroup,
        price=float(price.Price),
        stockCount=price.StockCount,
    )


@router.put("/prices/{price_id}", response_model=ProductPriceResponse)
def update_price(
    price_id: int,
    payload: ProductPriceInput,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    price = db.query(ProductPrice).filter(ProductPrice.ProductPriceID == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price row not found")
    price.AgeGroup = payload.ageGroup
    price.Price = payload.price
    price.StockCount = payload.stockCount
    db.commit()
    db.refresh(price)
    return ProductPriceResponse(
        productPriceId=price.ProductPriceID,
        ageGroup=price.AgeGroup,
        price=float(price.Price),
        stockCount=price.StockCount,
    )


@router.delete("/prices/{price_id}", status_code=204)
def delete_price(price_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    price = db.query(ProductPrice).filter(ProductPrice.ProductPriceID == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price row not found")
    db.delete(price)
    db.commit()
