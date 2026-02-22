from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = (
        "postgresql+asyncpg://siteforge:siteforge_dev@localhost:5432/siteforge"
    )
    catalog_excel_path: str = "../BoQ_v4.01 template OneCo v4.xlsm"
    tssr_template_path: str = "../Template TSSR_v6 19.03.2025 OneCo v1.docx"
    uploads_dir: str = "./uploads"
    cors_origins: list[str] = ["http://localhost:5173"]
    debug: bool = True


settings = Settings()
