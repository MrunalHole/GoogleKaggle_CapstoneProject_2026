from sqlalchemy import inspect, text

def run_migrations(engine):
    """Lightweight, idempotent schema patch for existing databases.

    This project has no Alembic; Base.metadata.create_all() only creates
    missing tables, so it won't add new columns to a `sessions` table that
    already existed before tonight's auth work. Existing rows are left with
    user_id=NULL (anonymous) rather than backfilled.
    """
    inspector = inspect(engine)
    if "sessions" not in inspector.get_table_names():
        return  # fresh DB -- create_all() already built it with all columns included

    existing_cols = {c["name"] for c in inspector.get_columns("sessions")}

    if "user_id" not in existing_cols:
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES users(id)"))
            else:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN user_id NUMERIC REFERENCES users(id)"))
        print("[OK] Migrated sessions table: added nullable user_id column.")

    if "csv_file_path" not in existing_cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN csv_file_path VARCHAR(255)"))
        print("[OK] Migrated sessions table: added nullable csv_file_path column.")

    if "attachments" not in existing_cols:
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE sessions ADD COLUMN attachments JSON"))
            else:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN attachments TEXT"))
        print("[OK] Migrated sessions table: added nullable attachments column.")

    # Migrate users table columns
    if "users" in inspector.get_table_names():
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        columns_to_add = [
            ("relative_name", "VARCHAR(255)"),
            ("relative_relation", "VARCHAR(255)"),
            ("relative_contact", "VARCHAR(255)"),
            ("doctor_name", "VARCHAR(255)"),
            ("doctor_contact", "VARCHAR(255)"),
            ("user_location", "VARCHAR(255)"),
        ]
        for col_name, col_type in columns_to_add:
            if col_name not in user_cols:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                print(f"[OK] Migrated users table: added nullable {col_name} column.")

