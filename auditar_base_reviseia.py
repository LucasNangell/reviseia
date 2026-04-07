#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Audita o banco MySQL do Revise IA após a importação dos materiais.

O script verifica:
- totais por tabela principal
- materiais sem tópicos
- materiais sem blocos
- materiais sem questões
- tópicos órfãos
- blocos órfãos
- materiais possivelmente duplicados por título
- distribuição por disciplina
- distribuição por edital/trilha base

Uso:
python auditar_base_reviseia.py --host 127.0.0.1 --user root --database reviseia
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
            autocommit=True,
        )

    def close(self):
        self.conn.close()

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


def print_section(title: str) -> None:
    print("\n" + "=" * 90)
    print(title)
    print("=" * 90)


def print_rows(rows: List[Tuple[Any, ...]], headers: List[str], max_rows: int = 30) -> None:
    if not rows:
        print("Nenhum registro encontrado.")
        return

    widths = [len(h) for h in headers]
    sample = rows[:max_rows]
    for row in sample:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len("" if val is None else str(val)))

    header_line = " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    sep_line = "-+-".join("-" * widths[i] for i in range(len(headers)))

    print(header_line)
    print(sep_line)
    for row in sample:
        print(" | ".join(("" if v is None else str(v)).ljust(widths[i]) for i, v in enumerate(row)))

    if len(rows) > max_rows:
        print(f"... exibindo {max_rows} de {len(rows)} linhas.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audita a base do Revise IA.")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", default=3306, type=int)
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="")
    parser.add_argument("--database", required=True)
    args = parser.parse_args()

    try:
        db = DB(args.host, args.port, args.user, args.password, args.database)
    except Error as exc:
        print(f"Falha ao conectar ao MySQL: {exc}")
        return 1

    try:
        print_section("TOTAIS DAS TABELAS PRINCIPAIS")
        totals = []
        for table in [
            "organizations", "exam_boards", "exams", "exam_editions", "subjects",
            "exam_subjects", "syllabus_topics", "content_sources", "materials",
            "material_requests", "material_topics", "material_blocks",
            "material_topic_components", "material_traps", "material_memory_points",
            "material_summary_items", "material_checklists", "material_questions",
            "material_references", "learning_tracks", "learning_track_items"
        ]:
            row = db.fetchone(f"SELECT COUNT(*) FROM `{table}`")
            totals.append((table, row[0] if row else 0))
        print_rows(totals, ["Tabela", "Total"], max_rows=100)

        print_section("MATERIAIS POR DISCIPLINA")
        rows = db.fetchall("""
            SELECT s.name AS disciplina, COUNT(m.id) AS total_materiais
            FROM subjects s
            LEFT JOIN materials m ON m.subject_id = s.id
            GROUP BY s.id, s.name
            ORDER BY s.name
        """)
        print_rows(rows, ["Disciplina", "Materiais"], max_rows=100)

        print_section("MATERIAIS SEM TÓPICOS")
        rows = db.fetchall("""
            SELECT m.id, m.title, s.name
            FROM materials m
            LEFT JOIN subjects s ON s.id = m.subject_id
            LEFT JOIN material_topics mt ON mt.material_id = m.id
            GROUP BY m.id, m.title, s.name
            HAVING COUNT(mt.id) = 0
            ORDER BY s.name, m.title
        """)
        print_rows(rows, ["Material ID", "Título", "Disciplina"])

        print_section("MATERIAIS SEM BLOCOS")
        rows = db.fetchall("""
            SELECT m.id, m.title, s.name
            FROM materials m
            LEFT JOIN subjects s ON s.id = m.subject_id
            LEFT JOIN material_blocks mb ON mb.material_id = m.id
            GROUP BY m.id, m.title, s.name
            HAVING COUNT(mb.id) = 0
            ORDER BY s.name, m.title
        """)
        print_rows(rows, ["Material ID", "Título", "Disciplina"])

        print_section("MATERIAIS SEM QUESTÕES")
        rows = db.fetchall("""
            SELECT m.id, m.title, s.name
            FROM materials m
            LEFT JOIN subjects s ON s.id = m.subject_id
            LEFT JOIN material_questions mq ON mq.material_id = m.id
            GROUP BY m.id, m.title, s.name
            HAVING COUNT(mq.id) = 0
            ORDER BY s.name, m.title
        """)
        print_rows(rows, ["Material ID", "Título", "Disciplina"])

        print_section("TÓPICOS ÓRFÃOS")
        rows = db.fetchall("""
            SELECT mt.id, mt.title, mt.material_id
            FROM material_topics mt
            LEFT JOIN materials m ON m.id = mt.material_id
            WHERE m.id IS NULL
            ORDER BY mt.id
        """)
        print_rows(rows, ["Topic ID", "Título", "Material ID"])

        print_section("BLOCOS ÓRFÃOS")
        rows = db.fetchall("""
            SELECT mb.id, mb.title, mb.material_id, mb.material_topic_id
            FROM material_blocks mb
            LEFT JOIN materials m ON m.id = mb.material_id
            WHERE m.id IS NULL
            ORDER BY mb.id
        """)
        print_rows(rows, ["Block ID", "Título", "Material ID", "Topic ID"])

        print_section("POSSÍVEIS TÍTULOS DUPLICADOS")
        rows = db.fetchall("""
            SELECT title, COUNT(*) AS qtd
            FROM materials
            GROUP BY title
            HAVING COUNT(*) > 1
            ORDER BY qtd DESC, title
        """)
        print_rows(rows, ["Título", "Quantidade"], max_rows=100)

        print_section("DETALHE DOS TÍTULOS DUPLICADOS")
        rows = db.fetchall("""
            SELECT m.title, m.id, s.name, m.slug
            FROM materials m
            INNER JOIN (
                SELECT title
                FROM materials
                GROUP BY title
                HAVING COUNT(*) > 1
            ) d ON d.title = m.title
            LEFT JOIN subjects s ON s.id = m.subject_id
            ORDER BY m.title, m.id
        """)
        print_rows(rows, ["Título", "Material ID", "Disciplina", "Slug"], max_rows=200)

        print_section("RESUMO FINAL")
        row_materials = db.fetchone("SELECT COUNT(*) FROM materials")
        row_tracks = db.fetchone("SELECT COUNT(*) FROM learning_tracks")
        row_track_items = db.fetchone("SELECT COUNT(*) FROM learning_track_items")
        print(f"Materiais...............: {row_materials[0] if row_materials else 0}")
        print(f"Trilhas..................: {row_tracks[0] if row_tracks else 0}")
        print(f"Itens de trilha..........: {row_track_items[0] if row_track_items else 0}")

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
