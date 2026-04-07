#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Backend MVP do Revise IA em FastAPI.

Endpoints incluídos:
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

Requisitos:
    pip install fastapi uvicorn mysql-connector-python pydantic

Execução:
    uvicorn app_reviseia_api:app --reload --host 127.0.0.1 --port 8000

Variáveis de ambiente opcionais:
    REVISEIA_DB_HOST=127.0.0.1
    REVISEIA_DB_PORT=3306
    REVISEIA_DB_USER=root
    REVISEIA_DB_PASSWORD=
    REVISEIA_DB_NAME=reviseia
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

import mysql.connector
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field


DB_HOST = os.getenv("REVISEIA_DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("REVISEIA_DB_PORT", "3306"))
DB_USER = os.getenv("REVISEIA_DB_USER", "root")
DB_PASSWORD = os.getenv("REVISEIA_DB_PASSWORD", "")
DB_NAME = os.getenv("REVISEIA_DB_NAME", "reviseia")


app = FastAPI(title="Revise IA API", version="0.1.0")


@contextmanager
def get_conn() -> Generator[mysql.connector.MySQLConnection, None, None]:
    conn = mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=False,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all_dict(conn, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    return rows


def fetch_one_dict(conn, sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params)
    row = cur.fetchone()
    cur.close()
    return row


def execute(conn, sql: str, params: tuple = ()) -> int:
    cur = conn.cursor()
    cur.execute(sql, params)
    last_id = cur.lastrowid
    cur.close()
    return int(last_id) if last_id else 0


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password_hash: str = Field(min_length=6, max_length=255)


class SubscriptionCreate(BaseModel):
    exam_edition_id: int
    learning_track_id: Optional[int] = None
    status: str = "active"


class MaterialProgressUpsert(BaseModel):
    status: str = Field(pattern="^(not_started|in_progress|completed)$")
    progress_percent: float = Field(ge=0, le=100)


class QuestionAttemptCreate(BaseModel):
    selected_answer: Optional[str] = None
    is_correct: bool
    response_time_seconds: Optional[int] = Field(default=None, ge=0)
    confidence_before_answer: Optional[int] = Field(default=None, ge=0, le=5)


class ChecklistProgressUpsert(BaseModel):
    checked: bool


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/tracks")
def list_tracks() -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = fetch_all_dict(conn, """
            SELECT
                lt.id,
                lt.name,
                lt.slug,
                lt.description,
                lt.track_type,
                lt.is_default,
                lt.published,
                ee.title AS exam_edition_title,
                eb.name AS board_name
            FROM learning_tracks lt
            INNER JOIN exam_editions ee ON ee.id = lt.exam_edition_id
            INNER JOIN exam_boards eb ON eb.id = ee.exam_board_id
            ORDER BY lt.is_default DESC, lt.name
        """)
        return rows


@app.get("/tracks/{track_id}")
def get_track(track_id: int) -> Dict[str, Any]:
    with get_conn() as conn:
        row = fetch_one_dict(conn, """
            SELECT
                lt.id,
                lt.name,
                lt.slug,
                lt.description,
                lt.track_type,
                lt.is_default,
                lt.published,
                ee.id AS exam_edition_id,
                ee.title AS exam_edition_title,
                eb.name AS board_name
            FROM learning_tracks lt
            INNER JOIN exam_editions ee ON ee.id = lt.exam_edition_id
            INNER JOIN exam_boards eb ON eb.id = ee.exam_board_id
            WHERE lt.id = %s
        """, (track_id,))
        if not row:
            raise HTTPException(status_code=404, detail="Trilha não encontrada")
        return row


@app.get("/tracks/{track_id}/items")
def list_track_items(track_id: int) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = fetch_all_dict(conn, """
            SELECT
                lti.id,
                lti.display_order,
                lti.estimated_minutes,
                lti.item_type,
                lti.is_required,
                s.name AS subject_name,
                m.id AS material_id,
                m.title AS material_title,
                m.base_number
            FROM learning_track_items lti
            LEFT JOIN subjects s ON s.id = lti.subject_id
            LEFT JOIN materials m ON m.id = lti.material_id
            WHERE lti.learning_track_id = %s
            ORDER BY lti.display_order, lti.id
        """, (track_id,))
        return rows


@app.get("/materials/{material_id}")
def get_material(material_id: int) -> Dict[str, Any]:
    with get_conn() as conn:
        material = fetch_one_dict(conn, """
            SELECT
                m.id,
                m.slug,
                m.title,
                m.base_number,
                m.topic_title,
                m.purpose,
                m.area_name,
                m.subarea_name,
                m.main_theme,
                m.theme_scope,
                m.depth_level,
                m.study_goal,
                m.target_audience,
                m.language_code,
                s.name AS subject_name
            FROM materials m
            LEFT JOIN subjects s ON s.id = m.subject_id
            WHERE m.id = %s
        """, (material_id,))
        if not material:
            raise HTTPException(status_code=404, detail="Material não encontrado")

        topics = fetch_all_dict(conn, """
            SELECT id, parent_id, external_topic_code, topic_number, title, level, display_order
            FROM material_topics
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        blocks = fetch_all_dict(conn, """
            SELECT id, material_topic_id, title, content_html, content_type, display_order
            FROM material_blocks
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        traps = fetch_all_dict(conn, """
            SELECT id, material_topic_id, title, description, how_to_avoid, display_order
            FROM material_traps
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        memory_points = fetch_all_dict(conn, """
            SELECT id, material_topic_id, title, content, display_order
            FROM material_memory_points
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        checklist = fetch_all_dict(conn, """
            SELECT id, material_topic_id, item_text, display_order
            FROM material_checklists
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        summary_items = fetch_all_dict(conn, """
            SELECT id, title, content, display_order
            FROM material_summary_items
            WHERE material_id = %s
            ORDER BY display_order, id
        """, (material_id,))

        return {
            "material": material,
            "topics": topics,
            "blocks": blocks,
            "traps": traps,
            "memory_points": memory_points,
            "checklist": checklist,
            "summary_items": summary_items,
        }


@app.get("/materials/{material_id}/questions")
def get_material_questions(material_id: int) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        material = fetch_one_dict(conn, "SELECT id FROM materials WHERE id = %s", (material_id,))
        if not material:
            raise HTTPException(status_code=404, detail="Material não encontrado")

        rows = fetch_all_dict(conn, """
            SELECT
                id,
                material_topic_id,
                external_question_code,
                question_type,
                statement,
                item_text,
                correct_answer,
                difficulty_level,
                commentary,
                source_name,
                source_year,
                is_real_question
            FROM material_questions
            WHERE material_id = %s
            ORDER BY id
        """, (material_id,))
        return rows


@app.post("/users")
def create_user(payload: UserCreate) -> Dict[str, Any]:
    with get_conn() as conn:
        existing = fetch_one_dict(conn, "SELECT id FROM users WHERE email = %s", (payload.email,))
        if existing:
            raise HTTPException(status_code=409, detail="E-mail já cadastrado")

        user_id = execute(conn, """
            INSERT INTO users (name, email, password_hash, status)
            VALUES (%s, %s, %s, 'active')
        """, (payload.name, payload.email, payload.password_hash))

        return {"id": user_id, "message": "Usuário criado com sucesso"}


@app.post("/users/{user_id}/subscriptions")
def create_subscription(user_id: int, payload: SubscriptionCreate) -> Dict[str, Any]:
    with get_conn() as conn:
        user = fetch_one_dict(conn, "SELECT id FROM users WHERE id = %s", (user_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        edition = fetch_one_dict(conn, "SELECT id FROM exam_editions WHERE id = %s", (payload.exam_edition_id,))
        if not edition:
            raise HTTPException(status_code=404, detail="Exam edition não encontrada")

        if payload.learning_track_id is not None:
            track = fetch_one_dict(conn, "SELECT id FROM learning_tracks WHERE id = %s", (payload.learning_track_id,))
            if not track:
                raise HTTPException(status_code=404, detail="Trilha não encontrada")

        existing = fetch_one_dict(conn, """
            SELECT id
            FROM user_exam_subscriptions
            WHERE user_id = %s
              AND exam_edition_id = %s
              AND ((learning_track_id IS NULL AND %s IS NULL) OR learning_track_id = %s)
        """, (user_id, payload.exam_edition_id, payload.learning_track_id, payload.learning_track_id))

        if existing:
            raise HTTPException(status_code=409, detail="Assinatura já existe")

        subscription_id = execute(conn, """
            INSERT INTO user_exam_subscriptions
                (user_id, exam_edition_id, learning_track_id, started_at, status)
            VALUES
                (%s, %s, %s, NOW(), %s)
        """, (user_id, payload.exam_edition_id, payload.learning_track_id, payload.status))

        return {"id": subscription_id, "message": "Assinatura criada com sucesso"}


@app.post("/users/{user_id}/materials/{material_id}/progress")
def upsert_material_progress(user_id: int, material_id: int, payload: MaterialProgressUpsert) -> Dict[str, Any]:
    with get_conn() as conn:
        user = fetch_one_dict(conn, "SELECT id FROM users WHERE id = %s", (user_id,))
        material = fetch_one_dict(conn, "SELECT id FROM materials WHERE id = %s", (material_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        if not material:
            raise HTTPException(status_code=404, detail="Material não encontrado")

        existing = fetch_one_dict(conn, """
            SELECT id
            FROM user_material_progress
            WHERE user_id = %s AND material_id = %s
        """, (user_id, material_id))

        completed_at = "NOW()" if payload.status == "completed" else "NULL"

        if existing:
            execute(conn, f"""
                UPDATE user_material_progress
                SET status = %s,
                    progress_percent = %s,
                    last_access_at = NOW(),
                    completed_at = {completed_at}
                WHERE id = %s
            """, (payload.status, payload.progress_percent, existing["id"]))
            return {"id": existing["id"], "message": "Progresso atualizado"}

        progress_id = execute(conn, f"""
            INSERT INTO user_material_progress
                (user_id, material_id, status, progress_percent, last_access_at, completed_at)
            VALUES
                (%s, %s, %s, %s, NOW(), {completed_at})
        """, (user_id, material_id, payload.status, payload.progress_percent))

        return {"id": progress_id, "message": "Progresso criado"}


@app.post("/users/{user_id}/questions/{question_id}/attempt")
def create_question_attempt(user_id: int, question_id: int, payload: QuestionAttemptCreate) -> Dict[str, Any]:
    with get_conn() as conn:
        user = fetch_one_dict(conn, "SELECT id FROM users WHERE id = %s", (user_id,))
        question = fetch_one_dict(conn, "SELECT id FROM material_questions WHERE id = %s", (question_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        if not question:
            raise HTTPException(status_code=404, detail="Questão não encontrada")

        attempt_id = execute(conn, """
            INSERT INTO user_question_attempts
                (user_id, material_question_id, selected_answer, is_correct, answered_at, response_time_seconds, confidence_before_answer)
            VALUES
                (%s, %s, %s, %s, NOW(), %s, %s)
        """, (
            user_id,
            question_id,
            payload.selected_answer,
            1 if payload.is_correct else 0,
            payload.response_time_seconds,
            payload.confidence_before_answer,
        ))

        return {"id": attempt_id, "message": "Tentativa registrada"}


@app.post("/users/{user_id}/checklists/{checklist_id}")
def upsert_checklist_progress(user_id: int, checklist_id: int, payload: ChecklistProgressUpsert) -> Dict[str, Any]:
    with get_conn() as conn:
        user = fetch_one_dict(conn, "SELECT id FROM users WHERE id = %s", (user_id,))
        checklist = fetch_one_dict(conn, "SELECT id FROM material_checklists WHERE id = %s", (checklist_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        if not checklist:
            raise HTTPException(status_code=404, detail="Checklist não encontrado")

        existing = fetch_one_dict(conn, """
            SELECT id
            FROM user_checklist_progress
            WHERE user_id = %s AND material_checklist_id = %s
        """, (user_id, checklist_id))

        if existing:
            execute(conn, """
                UPDATE user_checklist_progress
                SET checked = %s,
                    checked_at = CASE WHEN %s = 1 THEN NOW() ELSE NULL END
                WHERE id = %s
            """, (1 if payload.checked else 0, 1 if payload.checked else 0, existing["id"]))
            return {"id": existing["id"], "message": "Checklist atualizado"}

        checklist_progress_id = execute(conn, """
            INSERT INTO user_checklist_progress
                (user_id, material_checklist_id, checked, checked_at)
            VALUES
                (%s, %s, %s, CASE WHEN %s = 1 THEN NOW() ELSE NULL END)
        """, (user_id, checklist_id, 1 if payload.checked else 0, 1 if payload.checked else 0))

        return {"id": checklist_progress_id, "message": "Checklist criado"}
