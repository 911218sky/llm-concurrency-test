FROM python:3.12-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt
COPY --chown=app:app index.html server.py ./

ENV LLMCT_HOST=0.0.0.0 \
    LLMCT_PORT=8777 \
    PYTHONDONTWRITEBYTECODE=1

USER app
EXPOSE 8777

CMD ["python", "server.py"]
