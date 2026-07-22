"""Create (or promote) an Admin user.

Usage:
    python scripts/create_admin.py --phone 9999999999 --password Admin@123 --email admin@ktw.com

Run from the backend/ directory with the virtualenv active.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import hash_password
from app.database import SessionLocal
from app.models import User


def main():
    parser = argparse.ArgumentParser(description="Create or promote an Admin user")
    parser.add_argument("--phone", required=True, help="Phone number (used as username)")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--email", required=True, help="Admin email address")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.PhoneNumber == args.phone).first()
        if user:
            user.Role = "Admin"
            user.PasswordHash = hash_password(args.password)
            user.Email = args.email
            db.commit()
            print(f"Promoted existing user {args.phone} to Admin.")
        else:
            user = User(
                PhoneNumber=args.phone,
                PasswordHash=hash_password(args.password),
                Email=args.email,
                Role="Admin",
            )
            db.add(user)
            db.commit()
            print(f"Created new Admin user {args.phone}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
