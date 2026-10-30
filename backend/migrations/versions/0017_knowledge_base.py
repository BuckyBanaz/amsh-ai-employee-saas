"""Knowledge base: persisted chunks and table records, real processing status

Before this, a knowledge document's text lived only in `answer`, the search index lived only in the API process's memory
(rebuilt on demand from every document), and every upload was marked "indexed" whether or not any text came out of it.

Additive only:
  knowledge_documents  + content, content_hash, mime_type, file_size, file_data, error, meta, chunk_count, version,
                         updated_at, indexed_at; an index on business_id
  knowledge_chunks     the retrievable passages (business-scoped), with optional embeddings
  knowledge_records    spreadsheet/CSV/DOCX table rows as column -> value, for exact fee and price lookups

Existing documents and websites keep their text: it is copied from `answer` to `content`, and they are set to "uploaded" so
the API chunks them again on first use (backend/ai/engine/rag/index.py backfills documents without chunks). "pending" rows
become "uploaded". FAQs keep "indexed" (they are chunked from question + answer on first use the same way).

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None

NEW_DOC_COLUMNS = [
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('content_hash', sa.String(length=64), nullable=True),
    sa.Column('mime_type', sa.String(length=100), nullable=True),
    sa.Column('file_size', sa.Integer(), nullable=True),
    sa.Column('file_data', sa.LargeBinary(), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('meta', sa.JSON(), nullable=True),
    sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('indexed_at', sa.DateTime(timezone=True), nullable=True),
]


def _columns(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def _indexes(table):
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)}


def upgrade():
    have = _columns('knowledge_documents')
    with op.batch_alter_table('knowledge_documents') as batch:
        for col in NEW_DOC_COLUMNS:
            if col.name not in have:
                batch.add_column(col)
    if 'ix_knowledge_documents_business_id' not in _indexes('knowledge_documents'):
        op.create_index('ix_knowledge_documents_business_id', 'knowledge_documents', ['business_id'])
    if 'ix_knowledge_documents_content_hash' not in _indexes('knowledge_documents'):
        op.create_index('ix_knowledge_documents_content_hash', 'knowledge_documents', ['content_hash'])

    tables = _tables()
    if 'knowledge_chunks' not in tables:
        op.create_table(
            'knowledge_chunks',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('business_id', sa.String(length=36), nullable=False),
            sa.Column('document_id', sa.String(length=36), nullable=False),
            sa.Column('chunk_index', sa.Integer(), nullable=False),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('meta', sa.JSON(), nullable=True),
            sa.Column('text_hash', sa.String(length=64), nullable=False),
            sa.Column('embedding', sa.LargeBinary(), nullable=True),
            sa.Column('embedding_model', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
            sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_knowledge_chunks_business_id', 'knowledge_chunks', ['business_id'])
        op.create_index('ix_knowledge_chunks_business_document', 'knowledge_chunks', ['business_id', 'document_id'])
    if 'knowledge_records' not in tables:
        op.create_table(
            'knowledge_records',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('business_id', sa.String(length=36), nullable=False),
            sa.Column('document_id', sa.String(length=36), nullable=False),
            sa.Column('table_name', sa.String(length=255), nullable=False),
            sa.Column('row_index', sa.Integer(), nullable=False),
            sa.Column('data', sa.JSON(), nullable=False),
            sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
            sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_knowledge_records_business_id', 'knowledge_records', ['business_id'])
        op.create_index('ix_knowledge_records_business_document', 'knowledge_records', ['business_id', 'document_id'])

    # Keep every existing document's text, and let the API chunk it on first use.
    op.execute(
        "UPDATE knowledge_documents SET content = answer, status = 'uploaded', updated_at = uploaded_at "
        "WHERE doc_type IN ('document', 'website') AND content IS NULL"
    )
    op.execute("UPDATE knowledge_documents SET status = 'uploaded' WHERE status = 'pending'")
    op.execute("UPDATE knowledge_documents SET updated_at = uploaded_at WHERE updated_at IS NULL")


def downgrade():
    op.drop_table('knowledge_records')
    op.drop_table('knowledge_chunks')
    with op.batch_alter_table('knowledge_documents') as batch:
        for name in ('ix_knowledge_documents_business_id', 'ix_knowledge_documents_content_hash'):
            batch.drop_index(name)
        for col in NEW_DOC_COLUMNS:
            batch.drop_column(col.name)
