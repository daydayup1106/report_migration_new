"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings."""
    
    # API Keys
    anthropic_api_key: str
    
    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "report_migration"
    
    # Application
    max_file_size_mb: int = 10
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Vector Store
    vector_store_path: str = "./chromadb_data"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Get base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize settings
settings = Settings()

# Ensure vector store directory exists
os.makedirs(settings.vector_store_path, exist_ok=True)
