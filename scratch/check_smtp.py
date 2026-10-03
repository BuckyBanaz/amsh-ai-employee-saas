from backend.server.database.session import SessionLocal
from backend.server.database.models.platform_integration import PlatformIntegration
from backend.server.services import platform_smtp as ps

with SessionLocal() as db:
    saved = ps.save_settings(db, {"display_name": "AMSh Test", "from_email": "no-reply@example.com", "username": "user1", "host": "smtp.example.com", "port": 587, "security": "starttls"}, "S3cretPassw0rd")
    print("public view:", saved)
    row = db.get(PlatformIntegration, "platform_smtp")
    stored = row.config["smtp"]
    print("stored password is encrypted:", stored["password_enc"] != "S3cretPassw0rd", "| plaintext anywhere in row:", "S3cretPassw0rd" in str(row.config))
    print("decrypts back:", ps.load_settings(db)["password"] == "S3cretPassw0rd")
    try:
        ps.save_settings(db, {"from_email": "not-an-email"}, None)
    except ValueError as e:
        print("validation:", e)
    row.config = {}  # clean up the test data
    db.commit()
    print("cleaned:", ps.load_settings(db))
