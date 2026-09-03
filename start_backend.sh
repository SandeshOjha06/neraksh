#!/bin/bash
echo "Starting NERAKSH FastAPI Backend..."
cd "$(dirname "$0")/BACKEND"
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
