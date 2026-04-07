# Backend MVP - Revise IA

## 1. Instalar dependências
```bash
pip install -r requirements_api.txt
```

## 2. Configurar variáveis de ambiente (opcional)
PowerShell:
```powershell
$env:REVISEIA_DB_HOST="127.0.0.1"
$env:REVISEIA_DB_PORT="3306"
$env:REVISEIA_DB_USER="root"
$env:REVISEIA_DB_PASSWORD=""
$env:REVISEIA_DB_NAME="reviseia"
```

## 3. Rodar a API
```bash
uvicorn app_reviseia_api:app --reload --host 127.0.0.1 --port 8000
```

## 4. Documentação automática
Abra no navegador:
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

## 5. Endpoints principais
- GET /health
- GET /tracks
- GET /tracks/{track_id}
- GET /tracks/{track_id}/items
- GET /materials/{material_id}
- GET /materials/{material_id}/questions
- POST /users
- POST /users/{user_id}/subscriptions
- POST /users/{user_id}/materials/{material_id}/progress
- POST /users/{user_id}/questions/{question_id}/attempt
- POST /users/{user_id}/checklists/{checklist_id}
