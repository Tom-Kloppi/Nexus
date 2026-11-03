"""Würfelserver für NEXUS. Liefert das Spiel aus und würfelt serverseitig."""

from pathlib import Path

import secrets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[1] / "nexus"
app = FastAPI(title="NEXUS")


def roll_many(count, sides):
    count = max(1, min(64, int(count)))
    sides = max(2, min(1000, int(sides)))
    return [secrets.randbelow(sides) + 1 for _ in range(count)], sides


@app.get("/api/roll")
def roll(n: int = 1, sides: int = 100):
    rolls, used = roll_many(n, sides)
    return {"rolls": rolls, "sides": used, "source": "server"}


@app.websocket("/ws")
async def socket(connection: WebSocket):
    await connection.accept()
    try:
        while True:
            message = await connection.receive_json()
            if message.get("type") != "roll":
                await connection.send_json({"type": "error", "reason": "Nur roll."})
                continue
            rolls, used = roll_many(message.get("n") or 1, message.get("sides") or 100)
            await connection.send_json({"type": "roll", "rolls": rolls, "sides": used, "source": "server"})
    except WebSocketDisconnect:
        return


app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="game")
