from database import SessionLocal, engine, Base
import models

def init_and_seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if roles exist
        admin_role = db.query(models.Role).filter(models.Role.name == "Admin").first()
        if not admin_role:
            admin_role = models.Role(name="Admin", description="System Administrator & Risk Analyst")
            user_role = models.Role(name="User", description="Field Officer / Citizen")
            db.add_all([admin_role, user_role])
            db.commit()
            db.refresh(admin_role)
            db.refresh(user_role)

            admin_user = models.User(
                username="admin_ne",
                email="admin@neraksha.gov.in",
                full_name="Dr. A. K. Sharma (NE Disaster Cell)",
                role_id=admin_role.id
            )
            field_user = models.User(
                username="field_officer_1",
                email="officer1@neraksha.gov.in",
                full_name="Rajesh Gogoi (Field Team Assam)",
                role_id=user_role.id
            )
            db.add_all([admin_user, field_user])
            db.commit()
            print("Database seeded with default Admin and User profiles.")
        else:
            print("Database already seeded.")
    finally:
        db.close()

if __name__ == "__main__":
    init_and_seed_db()
