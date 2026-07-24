import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from proxy_checker import load_proxies_db, save_proxies_db, MTProtoProxyChecker

app = FastAPI(title="Telegram Proxy - @Rage_Kill API", version="3.0.0")

# Enable CORS for Vercel & Telegram Mini Apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

checker = MTProtoProxyChecker()

@app.get("/api/proxies")
async def get_proxies():
    proxies = load_proxies_db()
    return {
        "status": "ok",
        "proxies": proxies
    }

@app.get("/api/check_subscription")
async def check_subscription():
    return {
        "status": "ok",
        "is_subscribed": True,
        "channel": "@Rage_Kill"
    }

@app.post("/api/admin/add_proxy")
async def admin_add_proxy(request: Request):
    data = await request.json()
    text = data.get("text", "")
    parsed = checker.extract_proxies_from_content(text)
    
    if not parsed:
        return JSONResponse(status_code=400, content={"error": "Неверный формат ссылки MTProto"})
    
    tested = await checker.run_full_reping_cycle(parsed)
    if tested:
        db_proxies = load_proxies_db()
        db_proxies.insert(0, tested[0])
        save_proxies_db(db_proxies)
        return {"status": "ok", "added": tested[0]}
    else:
        return JSONResponse(status_code=400, content={"error": "Прокси недоступен или высока задержка"})

@app.post("/api/admin/delete_proxy")
async def admin_delete_proxy(request: Request):
    data = await request.json()
    proxy_id = data.get("id", "")
    db_proxies = load_proxies_db()
    updated = [p for p in db_proxies if p["id"] != proxy_id]
    save_proxies_db(updated)
    return {"status": "ok"}

# Serve WebApp static files
root_dir = os.path.dirname(__file__)
webapp_dir = os.path.join(root_dir, "webapp")
static_dir = webapp_dir if os.path.exists(os.path.join(webapp_dir, "index.html")) else root_dir

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static_frontend")

if __name__ == "__main__":
    # On Amvera Cloud, containers route HTTP traffic through port 80 or PORT env var
    port = int(os.getenv("PORT", 80))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
