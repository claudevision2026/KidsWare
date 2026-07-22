"""Seed the Vendors and Model reference tables.

Usage:
    python scripts/seed_reference_data.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models import Model, Vendor

VENDOR_NAMES = ["Harini", "SM"]
MODEL_NAMES = ["Lehanga", "Kurthi", "MonAndDaughter"]


def main():
    db = SessionLocal()
    try:
        for name in VENDOR_NAMES:
            if not db.query(Vendor).filter(Vendor.VendorName == name).first():
                db.add(Vendor(VendorName=name, Status="Active"))
                print(f"Inserted vendor: {name}")

        for name in MODEL_NAMES:
            if not db.query(Model).filter(Model.ModelName == name).first():
                db.add(Model(ModelName=name, Status="Active"))
                print(f"Inserted model: {name}")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
