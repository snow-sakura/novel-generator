# 番茄小说生成器 V1 后端（FastAPI）
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd -m appuser && mkdir -p /data && chown -R appuser /app /data
USER appuser
VOLUME /data

ENV HOST=0.0.0.0 PORT=8001 DATABASE_URL=sqlite:////data/novel_generator_v1.db
EXPOSE 8001
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
