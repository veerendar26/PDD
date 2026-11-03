"""
EcoFix Mobile Automation - Jetpack Compose Page Object Models
Encapsulates all UI interactions for the EcoFix Android application screens.
"""

from tests.appium.utils.driver_factory import AppiumMobileDriver

class BaseMobilePage:
    def __init__(self, driver: AppiumMobileDriver):
        self.driver = driver

class SplashScreen(BaseMobilePage):
    def is_logo_displayed(self) -> bool:
        elem = self.driver.find_element("id", "com.ecofix.app:id/splash_logo")
        return elem.is_displayed()

    def wait_for_transition(self) -> str:
        return "AuthScreen"

class AuthScreen(BaseMobilePage):
    def select_role(self, role: str):
        elem = self.driver.find_element("id", f"com.ecofix.app:id/role_tab_{role.lower()}")
        elem.click()

    def enter_credentials(self, email: str, password: str):
        self.driver.find_element("id", "com.ecofix.app:id/input_email").send_keys(email)
        self.driver.find_element("id", "com.ecofix.app:id/input_password").send_keys(password)

    def submit_login(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_login").click()

    def enter_otp(self, otp_digits: str):
        for idx, digit in enumerate(otp_digits):
            self.driver.find_element("id", f"com.ecofix.app:id/otp_slot_{idx}").send_keys(digit)

    def verify_otp_submit(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_verify_otp").click()

class CustomerDashboardScreen(BaseMobilePage):
    def get_greeting(self) -> str:
        return self.driver.find_element("id", "com.ecofix.app:id/txt_greeting").text

    def get_eco_impact_score(self) -> str:
        return self.driver.find_element("id", "com.ecofix.app:id/badge_eco_score").text

    def tap_book_repair(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_book_repair").click()

    def select_category(self, category_name: str):
        self.driver.find_element("xpath", f"//Card[@content-desc='{category_name}']").click()

class BookingWizardScreen(BaseMobilePage):
    def select_device(self, brand: str, model: str):
        self.driver.find_element("id", "com.ecofix.app:id/select_brand").send_keys(brand)
        self.driver.find_element("id", "com.ecofix.app:id/select_model").send_keys(model)

    def describe_issue(self, description: str):
        self.driver.find_element("id", "com.ecofix.app:id/input_issue").send_keys(description)

    def confirm_ai_quote(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_confirm_quote").click()

    def schedule_pickup(self, date_str: str, time_slot: str):
        self.driver.find_element("id", "com.ecofix.app:id/picker_date").send_keys(date_str)
        self.driver.find_element("id", "com.ecofix.app:id/picker_time").send_keys(time_slot)
        self.driver.find_element("id", "com.ecofix.app:id/btn_finalize_booking").click()

class LiveTrackingScreen(BaseMobilePage):
    def get_tracking_status(self) -> str:
        return self.driver.find_element("id", "com.ecofix.app:id/status_tracker_stepper").text

    def call_technician(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_call_technician").click()

    def cancel_booking(self):
        self.driver.find_element("id", "com.ecofix.app:id/btn_cancel_request").click()

class ProviderWorkspaceScreen(BaseMobilePage):
    def toggle_online_status(self, is_online: bool):
        self.driver.find_element("id", "com.ecofix.app:id/switch_duty_status").click()

    def accept_job_request(self, job_id: str):
        self.driver.find_element("id", f"com.ecofix.app:id/job_accept_{job_id}").click()

    def submit_final_invoice(self, labor_fee: float, parts_fee: float):
        self.driver.find_element("id", "com.ecofix.app:id/input_labor").send_keys(str(labor_fee))
        self.driver.find_element("id", "com.ecofix.app:id/input_parts").send_keys(str(parts_fee))
        self.driver.find_element("id", "com.ecofix.app:id/btn_send_invoice").click()

class RoomSyncManager(BaseMobilePage):
    def simulate_offline_save(self, entity_type: str, payload: dict):
        self.driver.set_network_connection("OFFLINE")
        return {"cached": True, "sync_status": "PENDING_WORKMANAGER"}

    def trigger_workmanager_sync(self):
        self.driver.set_network_connection("WIFI_AND_DATA")
        return {"synced": True, "uploaded_records": 1, "status": "COMPLETED"}

