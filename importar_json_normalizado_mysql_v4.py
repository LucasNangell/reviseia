#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Importador MySQL v4 para JSONs normalizados do Revise IA.

Objetivo desta versão:
- limpar o banco antes da importação (padrão)
- importar todos os arquivos possíveis
- eliminar conflitos em uq_material_topics_unique e uq_material_blocks_unique
  gerando códigos internos próprios para tópicos e blocos
- pular arquivos duplicados por fingerprint canônico
- tratar questões sem correct_answer
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set

import mysql.connector
from mysql.connector import Error


def read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def ensure_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def first_non_empty(*values: Any) -> Any:
    for v in values:
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        return v
    return None


def as_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def coerce_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    s = str(value).strip()
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


def coerce_bool_int(value: Any) -> int:
    if isinstance(value, bool):
        return 1 if value else 0
    if value is None:
        return 0
    s = str(value).strip().lower()
    if s in {"1", "true", "sim", "yes"}:
        return 1
    if s in {"0", "false", "nao", "não", "no"}:
        return 0
    return 0


def slugify(value: Any) -> str:
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


def short_hash(value: str, size: int = 8) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:size]


def normalize_correct_answer(value: Any) -> str:
    if value is None:
        return "N/D"
    s = str(value).strip()
    return s if s else "N/D"


def compute_canonical_fingerprint(data: Dict[str, Any]) -> str:
    cloned = copy.deepcopy(data)
    cloned.pop("normalized_at", None)
    cloned.pop("exported_at", None)

    metadata = ensure_dict(cloned.get("metadata"))
    metadata.pop("normalized_checksum", None)
    metadata.pop("source_file_name", None)
    cloned["metadata"] = metadata

    material = ensure_dict(cloned.get("material"))
    material.pop("content_checksum", None)
    cloned["material"] = material

    serialized = json.dumps(cloned, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def build_internal_topic_code(topic: Dict[str, Any], idx: int) -> str:
    base = f"{idx}|{topic.get('topic_number')}|{topic.get('title')}|{topic.get('external_topic_code')}"
    return f"top_{idx:04d}_{short_hash(base, 10)}"


def build_internal_block_code(block: Dict[str, Any], idx: int) -> str:
    base = f"{idx}|{block.get('title')}|{block.get('topic_id')}|{block.get('external_block_code')}"
    return f"blc_{idx:04d}_{short_hash(base, 10)}"


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

    def execute(self, sql: str, params: Tuple[Any, ...] = ()) -> None:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        cur.close()

    def fetchone(self, sql: str, params: Tuple[Any, ...] = ()) -> Optional[Tuple[Any, ...]]:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        return row

    def lastrowid_execute(self, sql: str, params: Tuple[Any, ...] = ()) -> int:
        cur = self.conn.cursor()
        cur.execute(sql, params)
        value = cur.lastrowid
        cur.close()
        return int(value)


def truncate_all_tables(db: DB) -> None:
    tables = [
        "user_review_queue",
        "user_checklist_progress",
        "user_question_attempts",
        "user_block_progress",
        "user_topic_progress",
        "user_material_progress",
        "user_exam_subscriptions",
        "users",
        "learning_track_items",
        "learning_tracks",
        "material_references",
        "material_questions",
        "material_checklists",
        "material_summary_items",
        "material_memory_points",
        "material_traps",
        "material_topic_components",
        "material_blocks",
        "material_topics",
        "material_requests",
        "materials",
        "content_blueprints",
        "content_sources",
        "syllabus_topics",
        "exam_subjects",
        "subjects",
        "exam_editions",
        "exams",
        "exam_boards",
        "organizations",
    ]
    db.execute("SET FOREIGN_KEY_CHECKS = 0")
    for table in tables:
        db.execute(f"TRUNCATE TABLE `{table}`")
    db.execute("SET FOREIGN_KEY_CHECKS = 1")


def get_or_create_organization(db: DB, name: str) -> int:
    row = db.fetchone("SELECT id FROM organizations WHERE name = %s", (name,))
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        "INSERT INTO organizations (name, slug) VALUES (%s, %s)",
        (name, slugify(name)),
    )


def get_or_create_exam_board(db: DB, name: str) -> int:
    row = db.fetchone("SELECT id FROM exam_boards WHERE name = %s", (name,))
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        "INSERT INTO exam_boards (name, slug) VALUES (%s, %s)",
        (name, slugify(name)),
    )


def get_or_create_exam(db: DB, organization_id: int, name: str) -> int:
    row = db.fetchone(
        "SELECT id FROM exams WHERE organization_id = %s AND slug = %s",
        (organization_id, slugify(name)),
    )
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        "INSERT INTO exams (organization_id, name, slug, status) VALUES (%s, %s, %s, 'active')",
        (organization_id, name, slugify(name)),
    )


def get_or_create_exam_edition(db: DB, exam_id: int, exam_board_id: int, year_reference: int, title: str, notice_version: str) -> int:
    row = db.fetchone(
        """
        SELECT id
        FROM exam_editions
        WHERE exam_id = %s
          AND exam_board_id = %s
          AND year_reference = %s
          AND notice_version = %s
        """,
        (exam_id, exam_board_id, year_reference, notice_version),
    )
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        """
        INSERT INTO exam_editions
            (exam_id, year_reference, title, notice_version, exam_board_id, status)
        VALUES
            (%s, %s, %s, %s, %s, 'active')
        """,
        (exam_id, year_reference, title, notice_version, exam_board_id),
    )


def get_or_create_subject(db: DB, name: str, area_name: Optional[str]) -> int:
    row = db.fetchone("SELECT id FROM subjects WHERE name = %s", (name,))
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        "INSERT INTO subjects (name, slug, area_name) VALUES (%s, %s, %s)",
        (name, slugify(name), area_name),
    )


def get_or_create_exam_subject(db: DB, exam_edition_id: int, subject_id: int) -> int:
    row = db.fetchone(
        "SELECT id FROM exam_subjects WHERE exam_edition_id = %s AND subject_id = %s",
        (exam_edition_id, subject_id),
    )
    if row:
        return int(row[0])
    return db.lastrowid_execute(
        "INSERT INTO exam_subjects (exam_edition_id, subject_id, display_order, is_required) VALUES (%s, %s, 0, 1)",
        (exam_edition_id, subject_id),
    )


def get_or_create_syllabus_topic(db: DB, exam_subject_id: int, parent_id: Optional[int], code: Optional[str], title: str, level: int, display_order: int) -> int:
    row = db.fetchone(
        """
        SELECT id
        FROM syllabus_topics
        WHERE exam_subject_id = %s
          AND ((code IS NULL AND %s IS NULL) OR code = %s)
          AND title = %s
        """,
        (exam_subject_id, code, code, title),
    )
    if row:
        db.execute(
            "UPDATE syllabus_topics SET parent_id = %s, level = %s, display_order = %s WHERE id = %s",
            (parent_id, level, display_order, int(row[0])),
        )
        return int(row[0])
    return db.lastrowid_execute(
        """
        INSERT INTO syllabus_topics
            (exam_subject_id, parent_id, code, title, level, display_order)
        VALUES
            (%s, %s, %s, %s, %s, %s)
        """,
        (exam_subject_id, parent_id, code, title, level, display_order),
    )


def upsert_content_source(db: DB, exam_edition_id: int, subject_id: int, file_path: Path, raw_data: Dict[str, Any], source_hash: str) -> int:
    row = db.fetchone("SELECT id FROM content_sources WHERE source_hash = %s", (source_hash,))
    raw_json = as_json(raw_data)
    schema_version = first_non_empty(raw_data.get("schema_version"), raw_data.get("normalizer_version"))
    if row:
        db.execute(
            """
            UPDATE content_sources
            SET exam_edition_id = %s,
                subject_id = %s,
                file_name = %s,
                file_path = %s,
                schema_version = %s,
                raw_json = %s,
                imported_at = NOW(),
                status = 'imported'
            WHERE id = %s
            """,
            (exam_edition_id, subject_id, file_path.name, str(file_path), schema_version, raw_json, int(row[0])),
        )
        return int(row[0])
    return db.lastrowid_execute(
        """
        INSERT INTO content_sources
            (exam_edition_id, subject_id, file_name, file_path, schema_version, source_hash, raw_json, imported_at, status)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, NOW(), 'imported')
        """,
        (exam_edition_id, subject_id, file_path.name, str(file_path), schema_version, source_hash, raw_json),
    )


def upsert_material(db: DB, content_source_id: int, subject_id: int, exam_board_id: int, exam_edition_id: int, material: Dict[str, Any], source_fingerprint: str) -> int:
    row = db.fetchone("SELECT id FROM materials WHERE content_source_id = %s", (content_source_id,))
    safe_slug = f"{slugify(first_non_empty(material.get('slug'), material.get('title'), material.get('topic_title'), 'material'))}-{short_hash(source_fingerprint, 8)}"
    content_checksum = source_fingerprint

    if row:
        db.execute(
            """
            UPDATE materials
            SET subject_id = %s,
                exam_board_id = %s,
                exam_edition_id = %s,
                slug = %s,
                title = %s,
                base_number = %s,
                topic_title = %s,
                purpose = %s,
                area_name = %s,
                subarea_name = %s,
                main_theme = %s,
                theme_scope = %s,
                depth_level = %s,
                study_goal = %s,
                target_audience = %s,
                language_code = %s,
                update_status = %s,
                current_note = %s,
                has_case_law = %s,
                case_law_justification = %s,
                has_information_limitation = %s,
                information_limitation_desc = %s,
                content_checksum = %s,
                published = 1
            WHERE id = %s
            """,
            (
                subject_id,
                exam_board_id,
                exam_edition_id,
                safe_slug,
                first_non_empty(material.get("title"), "Material sem título"),
                material.get("base_number"),
                material.get("topic_title"),
                material.get("purpose"),
                material.get("area_name"),
                material.get("subarea_name"),
                material.get("main_theme"),
                material.get("theme_scope"),
                material.get("depth_level"),
                material.get("study_goal"),
                material.get("target_audience"),
                material.get("language_code"),
                material.get("update_status"),
                material.get("current_note"),
                coerce_bool_int(material.get("has_case_law")),
                material.get("case_law_justification"),
                coerce_bool_int(material.get("has_information_limitation")),
                material.get("information_limitation_desc"),
                content_checksum,
                int(row[0]),
            ),
        )
        return int(row[0])

    return db.lastrowid_execute(
        """
        INSERT INTO materials
            (content_source_id, subject_id, exam_board_id, exam_edition_id, slug, title, base_number, topic_title,
             purpose, area_name, subarea_name, main_theme, theme_scope, depth_level, study_goal,
             target_audience, language_code, update_status, current_note, has_case_law,
             case_law_justification, has_information_limitation, information_limitation_desc, content_checksum, published)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """,
        (
            content_source_id,
            subject_id,
            exam_board_id,
            exam_edition_id,
            safe_slug,
            first_non_empty(material.get("title"), "Material sem título"),
            material.get("base_number"),
            material.get("topic_title"),
            material.get("purpose"),
            material.get("area_name"),
            material.get("subarea_name"),
            material.get("main_theme"),
            material.get("theme_scope"),
            material.get("depth_level"),
            material.get("study_goal"),
            material.get("target_audience"),
            material.get("language_code"),
            material.get("update_status"),
            material.get("current_note"),
            coerce_bool_int(material.get("has_case_law")),
            material.get("case_law_justification"),
            coerce_bool_int(material.get("has_information_limitation")),
            material.get("information_limitation_desc"),
            content_checksum,
        ),
    )


def upsert_material_request(db: DB, material_id: int, req: Dict[str, Any]) -> None:
    row = db.fetchone("SELECT id FROM material_requests WHERE material_id = %s", (material_id,))
    if row:
        db.execute(
            """
            UPDATE material_requests
            SET purpose = %s,
                general_area = %s,
                subject_name = %s,
                subarea_name = %s,
                main_theme = %s,
                theme_scope = %s,
                board_style = %s,
                depth_level = %s,
                goal = %s,
                base_topic_number = %s,
                topic_title = %s,
                syllabus_reference = %s,
                minimum_questions = %s,
                question_format = %s,
                prioritize_real_questions = %s,
                language_code = %s,
                target_audience = %s,
                additional_notes = %s,
                input_hash = %s
            WHERE id = %s
            """,
            (
                req.get("purpose"),
                req.get("general_area"),
                req.get("subject_name"),
                req.get("subarea_name"),
                req.get("main_theme"),
                req.get("theme_scope"),
                req.get("board_style"),
                req.get("depth_level"),
                req.get("goal"),
                req.get("base_topic_number"),
                req.get("topic_title"),
                req.get("syllabus_reference"),
                coerce_int(req.get("minimum_questions")),
                req.get("question_format"),
                coerce_bool_int(req.get("prioritize_real_questions")),
                req.get("response_language"),
                req.get("target_audience"),
                req.get("additional_notes"),
                req.get("input_hash"),
                int(row[0]),
            ),
        )
        return

    db.lastrowid_execute(
        """
        INSERT INTO material_requests
            (material_id, purpose, general_area, subject_name, subarea_name, main_theme, theme_scope,
             board_style, depth_level, goal, base_topic_number, topic_title, syllabus_reference,
             minimum_questions, question_format, prioritize_real_questions, language_code,
             target_audience, additional_notes, input_hash)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            material_id,
            req.get("purpose"),
            req.get("general_area"),
            req.get("subject_name"),
            req.get("subarea_name"),
            req.get("main_theme"),
            req.get("theme_scope"),
            req.get("board_style"),
            req.get("depth_level"),
            req.get("goal"),
            req.get("base_topic_number"),
            req.get("topic_title"),
            req.get("syllabus_reference"),
            coerce_int(req.get("minimum_questions")),
            req.get("question_format"),
            coerce_bool_int(req.get("prioritize_real_questions")),
            req.get("response_language"),
            req.get("target_audience"),
            req.get("additional_notes"),
            req.get("input_hash"),
        ),
    )


def clear_material_children(db: DB, material_id: int) -> None:
    db.execute("DELETE FROM material_references WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_questions WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_checklists WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_summary_items WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_memory_points WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_traps WHERE material_id = %s", (material_id,))
    db.execute(
        """
        DELETE mtc
        FROM material_topic_components mtc
        INNER JOIN material_topics mt ON mt.id = mtc.material_topic_id
        WHERE mt.material_id = %s
        """,
        (material_id,),
    )
    db.execute("DELETE FROM material_blocks WHERE material_id = %s", (material_id,))
    db.execute("DELETE FROM material_topics WHERE material_id = %s", (material_id,))


def insert_material_topics_and_syllabus(db: DB, material_id: int, exam_subject_id: int, topics: List[Dict[str, Any]]) -> Dict[str, int]:
    ext_to_material_topic_id: Dict[str, int] = {}
    orig_to_internal: Dict[str, str] = {}

    topics_copy = [dict(x) for x in topics]
    for idx, topic in enumerate(topics_copy, start=1):
        original_ext = str(first_non_empty(topic.get("external_topic_code"), f"top_raw_{idx}"))
        internal_ext = build_internal_topic_code(topic, idx)
        topic["_original_ext_code"] = original_ext
        topic["external_topic_code"] = internal_ext
        orig_to_internal[original_ext] = internal_ext

    syllabus_ids: Dict[str, int] = {}

    for topic in topics_copy:
        ext = str(topic["external_topic_code"])
        code = topic.get("topic_number")
        title = first_non_empty(topic.get("title"), "Tópico")
        level = coerce_int(topic.get("level")) or 1
        order = coerce_int(topic.get("order")) or 0

        syllabus_topic_id = get_or_create_syllabus_topic(db, exam_subject_id, None, code, title, level, order)
        syllabus_ids[ext] = syllabus_topic_id

        material_topic_id = db.lastrowid_execute(
            """
            INSERT INTO material_topics
                (material_id, parent_id, external_topic_code, syllabus_topic_id, topic_number, title, level, display_order, reference_block_external_id)
            VALUES
                (%s, NULL, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                material_id,
                ext,
                syllabus_topic_id,
                code,
                title,
                level,
                order,
                topic.get("reference_block_external_id"),
            ),
        )
        ext_to_material_topic_id[ext] = material_topic_id

    for topic in topics_copy:
        ext = str(topic["external_topic_code"])
        parent_raw = topic.get("parent_topic_id")
        if parent_raw:
            parent_internal = orig_to_internal.get(str(parent_raw))
            if parent_internal and parent_internal in ext_to_material_topic_id:
                db.execute(
                    "UPDATE material_topics SET parent_id = %s WHERE id = %s",
                    (ext_to_material_topic_id[parent_internal], ext_to_material_topic_id[ext]),
                )
                db.execute(
                    "UPDATE syllabus_topics SET parent_id = %s WHERE id = %s",
                    (syllabus_ids[parent_internal], syllabus_ids[ext]),
                )

    mapping_for_original_refs = {}
    for topic in topics_copy:
        mapping_for_original_refs[str(topic["_original_ext_code"])] = ext_to_material_topic_id[str(topic["external_topic_code"])]

    return mapping_for_original_refs


def insert_material_blocks(db: DB, material_id: int, topic_map: Dict[str, int], blocks: List[Dict[str, Any]]) -> None:
    blocks_copy = [dict(x) for x in blocks]
    for idx, block in enumerate(blocks_copy, start=1):
        block["external_block_code"] = build_internal_block_code(block, idx)

    for block in blocks_copy:
        topic_id = topic_map.get(str(block.get("topic_id"))) if block.get("topic_id") else None
        db.lastrowid_execute(
            """
            INSERT INTO material_blocks
                (material_id, material_topic_id, external_block_code, title, content_html, content_type, display_order)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                material_id,
                topic_id,
                block["external_block_code"],
                first_non_empty(block.get("title"), "Bloco"),
                block.get("content"),
                block.get("content_type"),
                coerce_int(block.get("order")) or 0,
            ),
        )


def insert_material_topic_components(db: DB, topic_map: Dict[str, int], items: List[Dict[str, Any]]) -> None:
    for item in items:
        topic_id = topic_map.get(str(item.get("topic_id"))) if item.get("topic_id") else None
        if not topic_id:
            continue
        db.execute(
            "INSERT INTO material_topic_components (material_topic_id, component_type, content, display_order) VALUES (%s, %s, %s, %s)",
            (topic_id, first_non_empty(item.get("component_type"), "Componente"), item.get("content"), coerce_int(item.get("order")) or 0),
        )


def insert_material_traps(db: DB, material_id: int, topic_map: Dict[str, int], items: List[Dict[str, Any]]) -> None:
    for item in items:
        topic_id = topic_map.get(str(item.get("topic_id"))) if item.get("topic_id") else None
        description = item.get("description") or ""
        example_error = item.get("example_error") or ""
        combined_description = description
        if example_error:
            combined_description = f"{description}\n\nExemplo de erro:\n{example_error}".strip()
        db.execute(
            "INSERT INTO material_traps (material_id, material_topic_id, title, description, how_to_avoid, display_order) VALUES (%s, %s, %s, %s, %s, %s)",
            (material_id, topic_id, first_non_empty(item.get("title"), "Pegadinha"), combined_description, item.get("how_to_avoid"), coerce_int(item.get("order")) or 0),
        )


def insert_material_memory_points(db: DB, material_id: int, topic_map: Dict[str, int], items: List[Dict[str, Any]]) -> None:
    for item in items:
        topic_id = topic_map.get(str(item.get("topic_id"))) if item.get("topic_id") else None
        db.execute(
            "INSERT INTO material_memory_points (material_id, material_topic_id, title, content, display_order) VALUES (%s, %s, %s, %s, %s)",
            (material_id, topic_id, item.get("title"), item.get("content"), coerce_int(item.get("order")) or 0),
        )


def insert_material_summary_items(db: DB, material_id: int, items: List[Dict[str, Any]]) -> None:
    for item in items:
        db.execute(
            "INSERT INTO material_summary_items (material_id, title, content, display_order) VALUES (%s, %s, %s, %s)",
            (material_id, item.get("title"), item.get("content"), coerce_int(item.get("order")) or 0),
        )


def insert_material_checklists(db: DB, material_id: int, topic_map: Dict[str, int], items: List[Dict[str, Any]]) -> None:
    for item in items:
        topic_id = topic_map.get(str(item.get("topic_id"))) if item.get("topic_id") else None
        db.execute(
            "INSERT INTO material_checklists (material_id, material_topic_id, item_text, display_order) VALUES (%s, %s, %s, %s)",
            (material_id, topic_id, first_non_empty(item.get("item_text"), "Checklist"), coerce_int(item.get("order")) or 0),
        )


def insert_material_questions(db: DB, material_id: int, topic_map: Dict[str, int], items: List[Dict[str, Any]]) -> None:
    for item in items:
        topic_id = topic_map.get(str(item.get("topic_id"))) if item.get("topic_id") else None
        question_type_raw = str(first_non_empty(item.get("format"), "Certo/Errado")).strip().lower()
        if "multipla" in question_type_raw or "múltipla" in question_type_raw:
            question_type = "multipla_escolha"
        elif "discurs" in question_type_raw:
            question_type = "discursiva"
        elif "certo" in question_type_raw or "errado" in question_type_raw:
            question_type = "certo_errado"
        else:
            question_type = "outro"

        statement = item.get("statement") or ""
        item_text = item.get("item_text")
        commentary = item.get("commentary")
        if item.get("alternatives"):
            alt_json = as_json(item.get("alternatives"))
            item_text = (item_text or "") + ("\n\nAlternativas:\n" + alt_json)

        source_name_parts = [item.get("board"), item.get("organization"), item.get("role")]
        source_name = " | ".join([str(x) for x in source_name_parts if x])

        db.execute(
            """
            INSERT INTO material_questions
                (material_id, material_topic_id, external_question_code, question_type, statement, item_text,
                 correct_answer, difficulty_level, commentary, source_name, source_year, is_real_question)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                material_id,
                topic_id,
                item.get("question_id"),
                question_type,
                statement,
                item_text,
                normalize_correct_answer(item.get("correct_answer")),
                item.get("difficulty"),
                commentary,
                source_name if source_name else None,
                coerce_int(item.get("year")),
                1 if source_name else 0,
            ),
        )


def insert_material_references(db: DB, material_id: int, items: List[Dict[str, Any]]) -> None:
    for item in items:
        db.execute(
            "INSERT INTO material_references (material_id, reference_type, author_name, title, publisher, year_reference, isbn, url, description) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                material_id,
                item.get("reference_type"),
                item.get("author_name"),
                first_non_empty(item.get("title"), "Referência"),
                item.get("publisher"),
                coerce_int(item.get("year_reference")),
                item.get("isbn"),
                item.get("url"),
                item.get("description"),
            ),
        )


def import_one_file(db: DB, file_path: Path, organization_name: str, exam_name: str, year_reference: int, board_name: str, notice_version: str, source_fingerprint: str) -> Dict[str, Any]:
    data = read_json(file_path)
    source_request = ensure_dict(data.get("source_request"))
    material = ensure_dict(data.get("material"))

    subject_name = first_non_empty(material.get("subject_name"), source_request.get("subject_name"), "Sem disciplina")
    area_name = material.get("area_name")
    material_title = first_non_empty(material.get("title"), material.get("topic_title"), file_path.stem)

    organization_id = get_or_create_organization(db, organization_name)
    exam_board_id = get_or_create_exam_board(db, board_name)
    exam_id = get_or_create_exam(db, organization_id, exam_name)
    exam_edition_id = get_or_create_exam_edition(db, exam_id, exam_board_id, year_reference, f"{exam_name} {year_reference}", notice_version)
    subject_id = get_or_create_subject(db, subject_name, area_name)
    exam_subject_id = get_or_create_exam_subject(db, exam_edition_id, subject_id)

    content_source_id = upsert_content_source(db, exam_edition_id, subject_id, file_path, data, source_fingerprint)
    material_id = upsert_material(db, content_source_id, subject_id, exam_board_id, exam_edition_id, material, source_fingerprint)
    upsert_material_request(db, material_id, source_request)
    clear_material_children(db, material_id)

    topic_map = insert_material_topics_and_syllabus(db, material_id, exam_subject_id, ensure_list(data.get("topicos")))
    insert_material_blocks(db, material_id, topic_map, ensure_list(data.get("blocos_textuais")))
    insert_material_topic_components(db, topic_map, ensure_list(data.get("topico_componentes")))
    insert_material_traps(db, material_id, topic_map, ensure_list(data.get("pegadinhas")))
    insert_material_memory_points(db, material_id, topic_map, ensure_list(data.get("pontos_memorizacao")))
    insert_material_summary_items(db, material_id, ensure_list(data.get("quadro_sinotico_itens")))
    insert_material_checklists(db, material_id, topic_map, ensure_list(data.get("checklist_revisao")))
    insert_material_questions(db, material_id, topic_map, ensure_list(data.get("questoes")))
    insert_material_references(db, material_id, ensure_list(data.get("referencias")))

    return {"subject": subject_name, "title": material_title, "material_id": material_id}


def discover_json_files(root: Path) -> List[Path]:
    return sorted(p for p in root.rglob("*.json") if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa JSONs normalizados para o MySQL.")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", default=3306, type=int)
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="")
    parser.add_argument("--database", required=True)
    parser.add_argument("--json-root", required=True)
    parser.add_argument("--organization", required=True)
    parser.add_argument("--exam", required=True)
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--board", required=True)
    parser.add_argument("--notice-version", default="edital_v1")
    parser.add_argument("--truncate-first", dest="truncate_first", action="store_true", default=True)
    parser.add_argument("--no-truncate-first", dest="truncate_first", action="store_false")
    args = parser.parse_args()

    json_root = Path(args.json_root).expanduser().resolve()
    if not json_root.exists() or not json_root.is_dir():
        print(f"ERRO: pasta dos JSONs não encontrada: {json_root}")
        return 1

    files = discover_json_files(json_root)
    if not files:
        print(f"Nenhum JSON encontrado em: {json_root}")
        return 1

    try:
        db = DB(args.host, args.port, args.user, args.password, args.database)
    except Error as exc:
        print(f"Falha ao conectar ao MySQL: {exc}")
        return 1

    try:
        if args.truncate_first:
            print("Limpando banco antes da importação...")
            truncate_all_tables(db)
            db.commit()

        print(f"Conectado ao banco: {args.database}")
        print(f"Arquivos encontrados: {len(files)}")
        print("-" * 90)

        ok = 0
        fail = 0
        dup = 0
        seen_fingerprints: Set[str] = set()

        for i, path in enumerate(files, start=1):
            try:
                data = read_json(path)
                fingerprint = compute_canonical_fingerprint(data)

                if fingerprint in seen_fingerprints:
                    dup += 1
                    print(f"[{i:03d}/{len(files):03d}] DUP  | {path.name} | conteúdo repetido")
                    continue

                result = import_one_file(
                    db=db,
                    file_path=path,
                    organization_name=args.organization,
                    exam_name=args.exam,
                    year_reference=args.year,
                    board_name=args.board,
                    notice_version=args.notice_version,
                    source_fingerprint=fingerprint,
                )
                db.commit()
                seen_fingerprints.add(fingerprint)
                ok += 1
                print(f"[{i:03d}/{len(files):03d}] OK   | {result['subject']} | {result['title']} | material_id={result['material_id']}")
            except Exception as exc:
                db.rollback()
                fail += 1
                print(f"[{i:03d}/{len(files):03d}] ERRO | {path.name} | {exc}")

        print("-" * 90)
        print("Importação concluída.")
        print(f"Sucesso    : {ok}")
        print(f"Duplicados : {dup}")
        print(f"Falhas     : {fail}")
        return 0 if fail == 0 else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
