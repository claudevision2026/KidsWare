from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Model, Vendor
from app.schemas import ModelResponse, VendorResponse

router = APIRouter(prefix="/api", tags=["reference-data"])


@router.get("/vendors", response_model=list[VendorResponse])
def list_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).filter(Vendor.Status == "Active").order_by(Vendor.VendorName).all()
    return [
        VendorResponse(vendorId=v.VendorID, vendorName=v.VendorName, status=v.Status) for v in vendors
    ]


@router.get("/models", response_model=list[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(Model).filter(Model.Status == "Active").order_by(Model.ModelName).all()
    return [
        ModelResponse(modelId=m.ModelID, modelName=m.ModelName, status=m.Status) for m in models
    ]
