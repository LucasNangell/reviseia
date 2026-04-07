#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Cria automaticamente a trilha inicial no banco Revise IA.

O script:
- garante a existência da trilha
- opcionalmente remove os itens anteriores dessa trilha
- percorre os materiais do edital informado
- ordena por disciplina, número base, título
- cria learning_track_items com estimativa de tempo

Uso:
python criar_trilha_inicial_reviseia.py --host 127.0.0.1 --user root --database reviseia --track-name "Trilha Completa — Policial Legislativo Câmara 2026" --organization "Camara dos Deputados" --exam "Policial Legislativo" --year 2026 --board "CEBRASPE" --notice-version "edital_v1"
"""

from __future__ import annotations

import argparse
import sys
from typing import Any, List, Tuple

import mysql.connector
from mysql.connector import Error


class DB:
    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            autocommit=False,
        )

    def close(self):
        self.conn.close()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def fetchall(self, sql: str, params: Tuple[Any, ...] = ()) -> List[Tuple[Any, ...]]:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        return rows

    def fetchone(self, sql: str, params: Tuple[Any, ...] = ()) -> Tuple[Any, ...] | None:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        return row

    def execute(self, sql: str, params: Tuple[Any, ...] = ()) -> None:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        cur.close()

    def lastrowid_execute(self, sql: str, params: Tuple[Any, ...] = ()) -> int:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        value = cur.lastrowid
        cur.close()
        return int(value)


def slugify(value: str) -> str:
    s = str(value or "").strip().lower()
    s = (
        s.replace("á", "a").replace("à", "a").replace("ã", "a").replace("â", "a")
         .replace("é", "e").replace("ê", "e")
         .replace("í", "i")
         .replace("ó", "o").replace("ô", "o").replace("õ", "o")
         .replace("ú", "u")
         .replace("ç", "c")
    )
    out = []
    last_dash = False
    for ch in s:
        if ch.isalnum():
            out.append(ch)
            last_dash = False
        else:
            if not last_dash:
                out.append("-")
            last_dash = True
    result = "".join(out).strip("-")
    while "--" in result:
        result = result.replace("--", "-")
    return result or "sem-slug"


def coerce_order(base_number: Any, title: str) -> Tuple[int, str]:
    if base_number is None:
        return (999999, title.lower())
    s = str(base_number).strip()
    digits = "".join(ch for ch in s if ch.isdigit())
    if not digits:
        return (999999, title.lower())
    return (int(digits), title.lower())


def estimate_minutes(block_count: int, question_count: int, trap_count: int) -> int:
    minutes = 15
    minutes += block_count * 6
    minutes += question_count * 2
    minutes += trap_count * 1
    return max(minutes, 20)


def get_exam_edition_id(db: DB, exam: str, board: str, year: int, notice_version: str) -> int:
    row = db.fetchone("""
        SELECT ee.id
        FROM exam_editions ee
        INNER JOIN exams e ON e.id = ee.exam_id
        INNER JOIN exam_boards b ON b.id = ee.exam_board_id
        WHERE e.name = %s
          AND b.name = %s
          AND ee.year_reference = %s
          AND ee.notice_version = %s
        LIMIT 1
    """, (exam, board, year, notice_version))
    if not row:
        raise RuntimeError("Não foi possível localizar o exam_edition correspondente.")
    return int(row[0])


def get_or_create_track(db: DB, exam_edition_id: int, track_name: str, track_type: str = "complete") -> int:
    slug = slugify(track_name)
    row = db.fetchone("""
        SELECT id
        FROM learning_tracks
        WHERE exam_edition_id = %s
          AND slug = %s
        LIMIT 1
    """, (exam_edition_id, slug))
    if row:
        db.execute("""
            UPDATE learning_tracks
            SET name = %s,
                description = %s,
                track_type = %s,
                is_default = 1,
                published = 1
            WHERE id = %s
        """, (
            track_name,
            f"Trilha gerada automaticamente para {track_name}",
            track_type,
            int(row[0]),
        ))
        return int(row[0])

    return db.lastrowid_execute("""
        INSERT INTO learning_tracks
            (exam_edition_id, name, slug, description, track_type, is_default, published)
        VALUES
            (%s, %s, %s, %s, %s, 1, 1)
    """, (
        exam_edition_id,
        track_name,
        slug,
        f"Trilha gerada automaticamente para {track_name}",
        track_type,
    ))


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria a trilha inicial do Revise IA.")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", default=3306, type=int)
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="")
    parser.add_argument("--database", required=True)
    parser.add_argument("--track-name", required=True)
    parser.add_argument("--organization", required=False)
    parser.add_argument("--exam", required=True)
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--board", required=True)
    parser.add_argument("--notice-version", default="edital_v1")
    parser.add_argument("--clear-existing-items", action="store_true", default=True)
    parser.add_argument("--no-clear-existing-items", dest="clear_existing_items", action="store_false")
    args = parser.parse_args()

    try:
        db = DB(args.host, args.port, args.user, args.password, args.database)
    except Error as exc:
        print(f"Falha ao conectar ao MySQL: {exc}")
        return 1

    try:
        exam_edition_id = get_exam_edition_id(db, args.exam, args.board, args.year, args.notice_version)
        track_id = get_or_create_track(db, exam_edition_id, args.track_name)

        if args.clear_existing_items:
            db.execute("DELETE FROM learning_track_items WHERE learning_track_id = %s", (track_id,))

        rows = db.fetchall("""
            SELECT
                m.id AS material_id,
                m.title,
                m.base_number,
                s.id AS subject_id,
                s.name AS subject_name,
                COALESCE(COUNT(DISTINCT mb.id), 0) AS block_count,
                COALESCE(COUNT(DISTINCT mq.id), 0) AS question_count,
                COALESCE(COUNT(DISTINCT mtp.id), 0) AS trap_count
            FROM materials m
            INNER JOIN subjects s ON s.id = m.subject_id
            LEFT JOIN material_blocks mb ON mb.material_id = m.id
            LEFT JOIN material_questions mq ON mq.material_id = m.id
            LEFT JOIN material_traps mtp ON mtp.material_id = m.id
            WHERE m.exam_edition_id = %s
            GROUP BY m.id, m.title, m.base_number, s.id, s.name
            ORDER BY s.name, m.title
        """, (exam_edition_id,))

        if not rows:
            raise RuntimeError("Nenhum material encontrado para o edital informado.")

        sorted_rows = sorted(rows, key=lambda r: (r[4].lower(), coerce_order(r[2], r[1])[0], r[1].lower()))

        display_order = 1
        inserted = 0

        for material_id, title, base_number, subject_id, subject_name, block_count, question_count, trap_count in sorted_rows:
            estimated_minutes = estimate_minutes(block_count, question_count, trap_count)
            db.execute("""
                INSERT INTO learning_track_items
                    (learning_track_id, subject_id, syllabus_topic_id, material_id, material_topic_id,
                     item_type, display_order, estimated_minutes, is_required, unlock_rule)
                VALUES
                    (%s, %s, NULL, %s, NULL, 'material', %s, %s, 1, NULL)
            """, (
                track_id,
                subject_id,
                material_id,
                display_order,
                estimated_minutes,
            ))
            display_order += 1
            inserted += 1

        db.commit()

        print("=" * 90)
        print("TRILHA CRIADA/ATUALIZADA COM SUCESSO")
        print("=" * 90)
        print(f"Track ID...............: {track_id}")
        print(f"Nome...................: {args.track_name}")
        print(f"Exam Edition ID........: {exam_edition_id}")
        print(f"Itens inseridos........: {inserted}")
        print("=" * 90)
        return 0

    except Exception as exc:
        db.rollback()
        print(f"FALHA: {exc}")
        return 1

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
