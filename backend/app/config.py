from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    db_server: str = "localhost"
    db_name: str = "KidsWare"
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_trusted_connection: str = "yes"
    db_trust_server_certificate: str = "yes"

    # JWT
    jwt_secret_key: str = "change-this-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Uploads
    upload_base_dir: str = "app/uploads"
    sizechart_subdir: str = "SizeChartsUpload"
    dress_images_subdir: str = "dressuploads"
    upload_base_url: str = "/uploads"

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    enable_buy_now: bool = True

    # WhatsApp
    whatsapp_number: str = ""
    whatsapp_message_template: str = "Hi! I'm interested in this dress:"

    # Translation (MyMemory free API - no key required; email raises the free daily quota)
    mymemory_email: str = ""

    @property
    def sqlalchemy_database_url(self) -> str:
        driver_quoted = self.db_driver.replace(" ", "+")
        return (
            f"mssql+pyodbc://@{self.db_server}/{self.db_name}"
            f"?driver={driver_quoted}"
            f"&trusted_connection={self.db_trusted_connection}"
            f"&TrustServerCertificate={self.db_trust_server_certificate}"
        )

    @property
    def sizechart_dir(self) -> Path:
        return Path(self.upload_base_dir) / self.sizechart_subdir

    @property
    def dress_images_dir(self) -> Path:
        return Path(self.upload_base_dir) / self.dress_images_subdir


settings = Settings()
