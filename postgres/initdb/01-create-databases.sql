SELECT 'CREATE DATABASE "infradesk"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'infradesk')\gexec

SELECT 'CREATE DATABASE "infradesk-chatbot"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'infradesk-chatbot')\gexec
