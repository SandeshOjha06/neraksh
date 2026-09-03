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
            user_role = models.Role(name="User", description="Field Officer")
            citizen_role = models.Role(name="Citizen", description="Local Citizen & Community Member")
            db.add_all([admin_role, user_role, citizen_role])
            db.commit()
            db.refresh(admin_role)
            db.refresh(user_role)
            db.refresh(citizen_role)

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
            citizen_user = models.User(
                username="citizen_dimapur",
                email="anita.roy@gmail.com",
                full_name="Anita Roy (Citizen - Gangtok, Sikkim)",
                role_id=citizen_role.id
            )
            db.add_all([admin_user, field_user, citizen_user])
            db.commit()
            print("Database seeded with Admin, Field Officer, and Citizen profiles.")
        else:
            # Check if Citizen user already exists
            citizen = db.query(models.User).filter(models.User.username == "citizen_dimapur").first()
            if not citizen:
                cit_role = db.query(models.Role).filter(models.Role.name == "Citizen").first()
                if not cit_role:
                    cit_role = models.Role(name="Citizen", description="Local Citizen & Community Member")
                    db.add(cit_role)
                    db.commit()
                    db.refresh(cit_role)
                citizen_user = models.User(
                    username="citizen_dimapur",
                    email="anita.roy@gmail.com",
                    full_name="Anita Roy (Citizen - Gangtok, Sikkim)",
                    role_id=cit_role.id
                )
                db.add(citizen_user)
                db.commit()
            print("Database already initialized.")
    finally:
        db.close()

if __name__ == "__main__":
    init_and_seed_db()
