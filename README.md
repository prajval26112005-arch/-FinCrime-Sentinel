# FinCrime Sentinel

Graph-based Anti-Money Laundering (AML) & Mule Ring Detection Platform built with Neo4j Aura, FastAPI, and Next.js 14.

---

## 1. Setup Environment

Create or verify `.env` in the project root:
```env
NEO4J_URI=neo4j+s://<id>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<your-password>
NEO4J_DATABASE=neo4j
LLM_PROVIDER=anthropic   # or openai
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## 2. Ingest Data into Neo4j

Generate synthetic financial transactions and ingest into Neo4j with automated risk scoring:
```powershell
# From project root
& "C:\Users\admin\AppData\Local\Programs\Python\Python311\python.exe" "backend\generate_data.py"
& "C:\Users\admin\AppData\Local\Programs\Python\Python311\python.exe" "backend\import_to_neo4j.py" --reset
```

---

## 3. Start Backend API (FastAPI)

```powershell
# Runs on http://localhost:8000
& "C:\Users\admin\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn main:app --app-dir "backend" --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Start Frontend (Next.js 14)

```powershell
# Runs on http://localhost:3000
cd "frontend"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
