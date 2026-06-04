#!/bin/bash

# Database Setup Script for TrueCall

echo "======================================"
echo "  TrueCall Database Setup"
echo "======================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo ""
    echo "Install PostgreSQL:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  MacOS:         brew install postgresql"
    echo "  Arch:          sudo pacman -S postgresql"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Get credentials from .env or prompt
if [ -f ".env" ]; then
    DB_USER=$(grep "^DATABASE_USERNAME=" .env | cut -d '=' -f2)
    DB_PASSWORD=$(grep "^DATABASE_PASSWORD=" .env | cut -d '=' -f2)
    DB_NAME=$(grep "^DATABASE_NAME=" .env | cut -d '=' -f2)
    DB_HOST=$(grep "^DATABASE_HOST=" .env | cut -d '=' -f2)
    DB_PORT=$(grep "^DATABASE_PORT=" .env | cut -d '=' -f2)
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "Database Configuration:"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  User:     $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if database exists
echo "Checking if database exists..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📦 Creating database '$DB_NAME'..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    
    if [ $? -eq 0 ]; then
        echo "✅ Database '$DB_NAME' created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

echo ""
echo "======================================"
echo "  Database Setup Complete! ✅"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Start the backend: pnpm start:dev"
echo "  2. Tables will be created automatically (TypeORM synchronize)"
echo ""
