"""Create (or reset) a platform administrator: AMSh staff who can sign in to the admin portal.

    python -m backend.scripts.create_platform_admin admin@example.com --name "Parikshit"

The password is asked for interactively (never on the command line, so it stays out of shell history).
"""

import argparse
import getpass
import sys
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.server.auth.security import hash_password
from backend.server.database.models.user import User

MIN_ADMIN_PASSWORD_LENGTH = 12


def create_platform_admin(db: Session, email: str, name: str, password: str) -> User:
    if len(password) < MIN_ADMIN_PASSWORD_LENGTH:
        raise ValueError(f"Admin passwords need at least {MIN_ADMIN_PASSWORD_LENGTH} characters")
    user = db.query(User).filter(User.email == email).first()
    if user and user.scope != "platform":
        raise ValueError("That email belongs to a clinic account; use a different email for the platform admin")
    if not user:
        user = User(email=email, name=name, hashed_password="", scope="platform", role="superadmin", business_id=None)
        db.add(user)
    user.name = name
    user.hashed_password = hash_password(password)
    user.is_active = True
    user.email_verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or reset a platform administrator")
    parser.add_argument("email")
    parser.add_argument("--name", default="Platform Admin")
    args = parser.parse_args()
    password = getpass.getpass("Password (12+ characters): ")
    if password != getpass.getpass("Repeat password: "):
        print("The passwords do not match.")
        return 1
    from backend.server.database.session import SessionLocal

    try:
        with SessionLocal() as db:
            user = create_platform_admin(db, args.email, args.name, password)
    except ValueError as e:
        print(str(e))
        return 1
    print(f"Platform admin ready: {user.email} (id {user.id})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
