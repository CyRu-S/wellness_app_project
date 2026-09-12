"""Inspect the configured Postgres database; reset only this application's records.

Requires psycopg[binary] and PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
Reset is deliberately a separate, explicit operation, never an application startup action.
"""
import argparse
import datetime
import json
from pathlib import Path

import psycopg
from psycopg import sql

TABLES = ['users', 'user_profiles', 'plans', 'plan_items', 'meals', 'meal_items',
          'products', 'water_logs', 'activity_sessions', 'notification_events',
          'missed_events', 'member_access_grants', 'meal_posts', 'media_objects']

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['inspect', 'reset-members', 'cleanup-verification'])
args = parser.parse_args()
with psycopg.connect(sslmode='require', connect_timeout=15) as connection:
    connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    existing = {row[0] for row in connection.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'")}
    print('Connected to:', connection.info.dbname)
    print('Public tables:', ', '.join(sorted(existing)) or '(empty)')
    secured = connection.execute("SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity AND tablename = ANY(%s)", (TABLES,)).fetchone()[0]
    print('Application tables protected by RLS:', secured)
    if 'users' in existing:
        for row in connection.execute('SELECT id, full_name, email, role, status, created_at FROM public.users ORDER BY id'):
            print('Account:', *row)
    for table in TABLES:
        if table in existing:
            count = connection.execute(sql.SQL('SELECT count(*) FROM public.{}').format(sql.Identifier(table))).fetchone()[0]
            print(f'{table}: {count}')
    if args.action in ('reset-members', 'cleanup-verification'):
        if not {'users', 'user_profiles'}.issubset(existing):
            raise SystemExit('Migrate the application schema before resetting records.')
        admins_before = connection.execute("SELECT id, email, password_hash, full_name, status FROM public.users WHERE role = 'ADMIN' ORDER BY id").fetchall()
        if not admins_before:
            raise SystemExit('No admin exists; refusing to reset before admin initialization.')
        # Back up only known application tables. Supabase auth/storage schemas are out of scope.
        backup = {}
        for table in TABLES:
            if table in existing:
                rows = connection.execute(sql.SQL('SELECT row_to_json(t) FROM public.{} t').format(sql.Identifier(table))).fetchall()
                backup[table] = [row[0] for row in rows]
        folder = Path(__file__).resolve().parents[1] / 'backups'
        folder.mkdir(exist_ok=True)
        path = folder / ('before-member-reset-' + datetime.datetime.now(datetime.UTC).strftime('%Y%m%dT%H%M%SZ') + '.json')
        path.write_text(json.dumps(backup, default=str), encoding='utf-8')
        if args.action == 'cleanup-verification':
            targets = connection.execute("SELECT id FROM public.users WHERE role = 'USER' AND full_name LIKE 'Integration Check %' AND email ~ '^qa-[a-f0-9]{10}-(member|viewer|declined)@example[.]invalid$'").fetchall()
            ids = [row[0] for row in targets]
            preserved_ids = [row[0] for row in connection.execute('SELECT id FROM public.users WHERE NOT (id = ANY(%s)) ORDER BY id', (ids,))]
            def preserved_records():
                result = {}
                for table in ['users', 'user_profiles', 'plans', 'meals', 'water_logs', 'activity_sessions', 'notification_events', 'missed_events', 'meal_posts']:
                    column = 'id' if table == 'users' else 'user_id'
                    result[table] = connection.execute(sql.SQL('SELECT row_to_json(t) FROM public.{} t WHERE {} = ANY(%s) ORDER BY id').format(sql.Identifier(table), sql.Identifier(column)), (preserved_ids,)).fetchall()
                result['plan_items'] = connection.execute('SELECT row_to_json(t) FROM public.plan_items t WHERE plan_id IN (SELECT id FROM public.plans WHERE user_id = ANY(%s)) ORDER BY id', (preserved_ids,)).fetchall()
                result['photos'] = connection.execute('SELECT media_key, content FROM public.media_objects WHERE media_key IN (SELECT photo_media_key FROM public.user_profiles WHERE user_id = ANY(%s)) OR media_key IN (SELECT media_key FROM public.meal_posts WHERE user_id = ANY(%s)) ORDER BY media_key', (preserved_ids, preserved_ids)).fetchall()
                return result
            retained_before = preserved_records()
            print('Removing verification account IDs:', ids)
            connection.execute('DELETE FROM public.users WHERE id = ANY(%s)', (ids,))
        else:
            for table in ['meal_posts', 'meal_items', 'meals', 'plan_items', 'plans', 'water_logs',
                          'activity_sessions', 'notification_events', 'missed_events', 'member_access_grants', 'products']:
                if table in existing:
                    connection.execute(sql.SQL('DELETE FROM public.{}').format(sql.Identifier(table)))
            connection.execute("DELETE FROM public.users WHERE role = 'USER'")
        if 'media_objects' in existing:
            connection.execute('DELETE FROM public.media_objects WHERE media_key NOT IN (SELECT photo_media_key FROM public.user_profiles WHERE photo_media_key IS NOT NULL) AND media_key NOT IN (SELECT media_key FROM public.meal_posts)')
        if args.action == 'cleanup-verification':
            if preserved_records() != retained_before:
                raise RuntimeError('Preserved member data changed; rolling back cleanup')
            print('Preserved accounts and their data verified unchanged:', preserved_ids)
        admins_after = connection.execute("SELECT id, email, password_hash, full_name, status FROM public.users WHERE role = 'ADMIN' ORDER BY id").fetchall()
        if admins_after != admins_before:
            raise RuntimeError('Admin preservation check failed; rolling back')
        print('Cleanup complete. Admin records unchanged. Backup:', path)
