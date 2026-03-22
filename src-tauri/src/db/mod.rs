use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
    SqlitePool,
};
use std::path::Path;

pub async fn init_pool(db_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let connect_opts = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .pragma("foreign_keys", "ON");

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_opts)
        .await?;

    sqlx::raw_sql(include_str!("migrations/001_initial.sql"))
        .execute(&pool)
        .await?;

    log::info!("Database pool initialised at {}", db_path.display());
    Ok(pool)
}
