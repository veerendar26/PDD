"""
EcoFix Performance & Scalability Framework - Locust Load Testing
Simulates realistic concurrent customer, technician, and anonymous traffic profiles.
"""

from locust import HttpUser, task, between, tag

class AnonymousVisitor(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    @tag("browse")
    def view_homepage(self):
        self.client.get("/", name="[Page] Home Landing")

    @task(2)
    @tag("browse")
    def view_auth_pages(self):
        self.client.get("/auth/login", name="[Page] Auth Login")
        self.client.get("/auth/register", name="[Page] Auth Register")

class CustomerUser(HttpUser):
    wait_time = between(2, 5)

    @task(4)
    @tag("customer")
    def customer_dashboard(self):
        self.client.get("/dashboard", name="[Page] Customer Dashboard")

    @task(2)
    @tag("customer")
    def booking_flow(self):
        self.client.get("/book", name="[Page] Booking Wizard")

    @task(1)
    @tag("customer")
    def tracking_flow(self):
        self.client.get("/bookings/ECO-8921", name="[Page] Live Tracking")

class TechnicianUser(HttpUser):
    wait_time = between(3, 7)

    @task(3)
    @tag("provider")
    def provider_workspace(self):
        self.client.get("/provider", name="[Page] Provider Workspace")

    @task(2)
    @tag("provider")
    def provider_history(self):
        self.client.get("/history", name="[Page] Repair History")

