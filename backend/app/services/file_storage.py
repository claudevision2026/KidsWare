import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def save_upload(file: UploadFile, target_dir: Path) -> str:
    target_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        suffix = ".jpg"

    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = target_dir / filename

    with destination.open("wb") as buffer:
        buffer.write(file.file.read())

    relative_path = destination.as_posix().split(settings.upload_base_dir.replace("\\", "/") + "/", 1)[-1]
    return f"{settings.upload_base_url}/{relative_path}"
