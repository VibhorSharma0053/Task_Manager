from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


mongodb = MongoDB()


async def connect_to_mongo():
    """Open MongoDB connection."""
    print("🔌 Connecting to MongoDB...")
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URI)
    mongodb.db = mongodb.client[settings.DB_NAME]

    # Test connection
    try:
        await mongodb.client.admin.command("ping")
        print(f"✅ Connected to MongoDB: {settings.DB_NAME}")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise

    # Create indexes
    await create_indexes()


async def close_mongo_connection():
    """Close MongoDB connection."""
    if mongodb.client:
        mongodb.client.close()
        print("🔒 MongoDB connection closed")


async def create_indexes():
    """Create indexes for performance and uniqueness."""
    await mongodb.db.users.create_index("email", unique=True)
    await mongodb.db.project_members.create_index(
        [("project_id", 1), ("user_id", 1)], unique=True
    )
    await mongodb.db.tasks.create_index("project_id")
    await mongodb.db.tasks.create_index("assignee_id")
    print("📑 Indexes created")


def get_db():
    """Dependency to get DB instance."""
    return mongodb.db