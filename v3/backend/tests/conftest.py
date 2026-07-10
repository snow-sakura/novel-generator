import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["OPENAI_API_KEY"] = "sk-test-placeholder"
os.environ["LLM_PROVIDER"] = "test"

from app.database import engine, Base
from app.main import app
from fastapi.testclient import TestClient
import pytest


@pytest.fixture(scope="function", autouse=True)
def _db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
