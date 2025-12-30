# SERVICE_NAME

Description of the service.

## Development

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Docker

```bash
docker build -t SERVICE_NAME .
docker run -p 8000:8000 SERVICE_NAME
```
