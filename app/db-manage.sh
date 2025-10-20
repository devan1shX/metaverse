#!/bin/bash

# Database Setup and Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_CONTAINER_NAME="metaverse-db"
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="postgres"
DB_PASSWORD="aahan123"
DB_NAME="postgres"

echo -e "${GREEN}Metaverse Database Management Script${NC}"
echo "======================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running${NC}"
        exit 1
    fi
}

# Function to start database
start_db() {
    echo -e "${YELLOW}Starting PostgreSQL database...${NC}"
    
    if docker ps -q -f name=$DB_CONTAINER_NAME | grep -q .; then
        echo -e "${GREEN}Database container is already running${NC}"
    else
        docker-compose -f docker-compose.db.yml up -d
        echo -e "${GREEN}Database started successfully${NC}"
        
        # Wait for database to be ready
        echo -e "${YELLOW}Waiting for database to be ready...${NC}"
        sleep 5
        
        # Test connection
        test_connection
    fi
}

# Function to stop database
stop_db() {
    echo -e "${YELLOW}Stopping PostgreSQL database...${NC}"
    docker-compose -f docker-compose.db.yml down
    echo -e "${GREEN}Database stopped successfully${NC}"
}

# Function to restart database
restart_db() {
    echo -e "${YELLOW}Restarting PostgreSQL database...${NC}"
    stop_db
    start_db
}

# Function to test database connection
test_connection() {
    echo -e "${YELLOW}Testing database connection...${NC}"
    
    if node config/db_conn_test.js; then
        echo -e "${GREEN}Database connection successful!${NC}"
    else
        echo -e "${RED}Database connection failed!${NC}"
        echo -e "${YELLOW}Troubleshooting tips:${NC}"
        echo "1. Make sure the database container is running: docker ps"
        echo "2. Check database logs: docker logs $DB_CONTAINER_NAME"
        echo "3. Verify port $DB_PORT is not in use: lsof -i :$DB_PORT"
        exit 1
    fi
}

# Function to show database status
status() {
    echo -e "${YELLOW}Database Status:${NC}"
    
    if docker ps -q -f name=$DB_CONTAINER_NAME | grep -q .; then
        echo -e "${GREEN}✓ Container is running${NC}"
        echo -e "${YELLOW}Container details:${NC}"
        docker ps -f name=$DB_CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Test connection
        if node config/db_conn_test.js > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Database connection is working${NC}"
        else
            echo -e "${RED}✗ Database connection failed${NC}"
        fi
    else
        echo -e "${RED}✗ Container is not running${NC}"
    fi
}

# Function to show logs
logs() {
    echo -e "${YELLOW}Database logs:${NC}"
    docker logs -f $DB_CONTAINER_NAME
}

# Function to connect to database shell
shell() {
    echo -e "${YELLOW}Connecting to database shell...${NC}"
    docker exec -it $DB_CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
}

# Function to reset database (drop all tables and recreate)
reset_db() {
    echo -e "${YELLOW}Resetting database...${NC}"
    echo -e "${RED}WARNING: This will delete ALL data in the database!${NC}"
    
    # Ask for confirmation
    read -p "Are you sure you want to reset the database? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Database reset cancelled${NC}"
        return
    fi
    
    # Check if database is running
    if ! docker ps -q -f name=$DB_CONTAINER_NAME | grep -q .; then
        echo -e "${RED}Database container is not running. Starting it first...${NC}"
        start_db
    fi
    
    # Nuclear option - drop and recreate entire database
    echo -e "${YELLOW}Performing nuclear database reset...${NC}"
    echo -e "${RED}Dropping entire database and recreating from scratch...${NC}"
    
    # Connect to postgres database and drop/recreate the main database
    if docker exec -i $DB_CONTAINER_NAME psql -U $DB_USER -d postgres << EOF
-- Terminate all connections to the database
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();

-- Drop the database completely
DROP DATABASE IF EXISTS $DB_NAME;

-- Recreate the database
CREATE DATABASE $DB_NAME;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    then
        echo -e "${GREEN}Database dropped and recreated successfully!${NC}"
        
        # Wait a moment for database to be ready
        sleep 2
        
        # Now run the initialization
        echo -e "${YELLOW}Initializing fresh database schema...${NC}"
        if node -e "
            const { init_db } = require('./config/init_db');
            const { logger } = require('./utils/logger');
            
            async function resetDatabase() {
                try {
                    // Skip cleaner since we already dropped the entire database
                    await init_db(true);
                    console.log('Database reset completed successfully!');
                    process.exit(0);
                } catch (error) {
                    console.error('Database reset failed:', error.message);
                    process.exit(1);
                }
            }
            
            resetDatabase();
        "; then
            echo -e "${GREEN}Complete database reset successful!${NC}"
            echo -e "${GREEN}✓ Database completely destroyed and recreated${NC}"
            echo -e "${GREEN}✓ All tables recreated with fresh schema${NC}"
            echo -e "${GREEN}✓ Admin user created${NC}"
        else
            echo -e "${RED}Database initialization failed after reset!${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Failed to drop and recreate database!${NC}"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the PostgreSQL database"
    echo "  stop      Stop the PostgreSQL database"
    echo "  restart   Restart the PostgreSQL database"
    echo "  reset     Reset database (drop all tables and recreate)"
    echo "  status    Show database status"
    echo "  test      Test database connection"
    echo "  logs      Show database logs"
    echo "  shell     Connect to database shell"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start the database"
    echo "  $0 reset    # Reset database (WARNING: deletes all data)"
    echo "  $0 test     # Test connection"
    echo "  $0 shell    # Open database shell"
}

# Main script logic
case "${1:-}" in
    start)
        check_docker
        start_db
        ;;
    stop)
        check_docker
        stop_db
        ;;
    restart)
        check_docker
        restart_db
        ;;
    reset)
        check_docker
        reset_db
        ;;
    status)
        check_docker
        status
        ;;
    test)
        test_connection
        ;;
    logs)
        check_docker
        logs
        ;;
    shell)
        check_docker
        shell
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        echo -e "${YELLOW}No command specified. Use 'help' for usage information.${NC}"
        show_help
        exit 1
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
