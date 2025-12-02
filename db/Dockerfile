# Use the official PostgreSQL image
    FROM postgres:15-alpine

    # Copy the initialization script to the special entrypoint folder
    # This automatically runs the SQL file when the container starts
    COPY database.sql /docker-entrypoint-initdb.d/