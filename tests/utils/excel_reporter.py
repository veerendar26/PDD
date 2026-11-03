"""
EcoFix Automated Test Framework - Excel Report Generator
Generates professional multi-sheet Excel reports with executive summary,
KPI metrics, test result grids, and category-filtered sheets.
"""

import os
import datetime
from typing import List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

class ExcelReportGenerator:
    BRAND_COLOR = "10B981"      # Emerald brand color
    HEADER_BG = "0F172A"        # Slate-900 header
    SUBHEADER_BG = "1E293B"     # Slate-800
    ACCENT_BG = "ECFDF5"        # Emerald-50 light row
    CARD_BG = "F8FAFC"          # Slate-50 card
    TEXT_WHITE = "FFFFFF"
    BORDER_COLOR = "CBD5E1"     # Slate-300
    PASS_COLOR = "16A34A"       # Green-600
    FAIL_COLOR = "DC2626"       # Red-600
    WARN_COLOR = "D97706"       # Amber-600

    def __init__(self, suite_title: str, category_name: str, environment: str = "Local / CI Runner"):
        self.suite_title = suite_title
        self.category_name = category_name
        self.environment = environment
        self.results: List[Dict[str, Any]] = []

    def add_result(self, result: Dict[str, Any]):
        self.results.append(result)

    def set_results(self, results: List[Dict[str, Any]]):
        self.results = results

    def generate(self, output_path: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        wb = openpyxl.Workbook()
        
        # 1. Summary Sheet
        ws_summary = wb.active
        ws_summary.title = "SUMMARY"
        self._build_summary_sheet(ws_summary)
        
        # 2. Complete Test Results Sheet
        ws_results = wb.create_sheet(title="TEST RESULTS")
        self._build_results_sheet(ws_results, self.results)
        
        # 3. Category Sheets (e.g. UI_UX, FUNCTIONAL, VALIDATION, REGRESSION, E2E, DEPLOYABILITY)
        categories = set(r.get("category", "FUNCTIONAL") for r in self.results)
        for cat in sorted(categories):
            sheet_title = cat.upper().replace("/", "_").replace(" ", "_")[:31]
            cat_results = [r for r in self.results if r.get("category") == cat]
            if cat_results:
                ws_cat = wb.create_sheet(title=sheet_title)
                self._build_results_sheet(ws_cat, cat_results)
        
        wb.save(output_path)
        return output_path

    def _build_summary_sheet(self, ws):
        ws.views.sheetView[0].showGridLines = True
        
        total = len(self.results)
        passed = sum(1 for r in self.results if str(r.get("status", "")).upper() == "PASS")
        failed = sum(1 for r in self.results if str(r.get("status", "")).upper() == "FAIL")
        skipped = sum(1 for r in self.results if str(r.get("status", "")).upper() == "SKIPPED")
        blocked = sum(1 for r in self.results if str(r.get("status", "")).upper() == "BLOCKED")
        pass_rate = (passed / total * 100) if total > 0 else 100.0
        
        total_time = sum(float(r.get("execution_time", 0.0) or 0.0) for r in self.results)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        deployment_readiness = "READY FOR DEPLOYMENT" if failed == 0 and blocked == 0 and total > 0 else "ACTION REQUIRED"

        thin_border = Border(
            left=Side(style='thin', color=self.BORDER_COLOR),
            right=Side(style='thin', color=self.BORDER_COLOR),
            top=Side(style='thin', color=self.BORDER_COLOR),
            bottom=Side(style='thin', color=self.BORDER_COLOR)
        )

        # Header Banner
        ws.merge_cells("A1:G2")
        title_cell = ws["A1"]
        title_cell.value = f"EcoFix — {self.suite_title} Quality & Verification Report"
        title_cell.font = Font(name="Segoe UI", size=16, bold=True, color=self.TEXT_WHITE)
        title_cell.fill = PatternFill(start_color=self.HEADER_BG, end_color=self.HEADER_BG, fill_type="solid")
        title_cell.alignment = Alignment(horizontal="center", vertical="center")

        # Subtitle Row
        ws.merge_cells("A3:G3")
        sub_cell = ws["A3"]
        sub_cell.value = f"Automated Execution Summary • Category: {self.category_name} • Environment: {self.environment} • Generated: {timestamp}"
        sub_cell.font = Font(name="Segoe UI", size=10, italic=True, color="94A3B8")
        sub_cell.fill = PatternFill(start_color=self.SUBHEADER_BG, end_color=self.SUBHEADER_BG, fill_type="solid")
        sub_cell.alignment = Alignment(horizontal="center", vertical="center")

        ws.row_dimensions[1].height = 24
        ws.row_dimensions[2].height = 24
        ws.row_dimensions[3].height = 20
        ws.row_dimensions[4].height = 10

        # KPI Metrics Cards (Row 5 - 7)
        kpi_metrics = [
            ("TOTAL TESTS", str(total), "0F172A", "38BDF8"),
            ("PASSED", str(passed), "064E3B", self.PASS_COLOR),
            ("FAILED", str(failed), "7F1D1D" if failed > 0 else "0F172A", self.FAIL_COLOR if failed > 0 else "94A3B8"),
            ("PASS RATE", f"{pass_rate:.1f}%", "064E3B", self.PASS_COLOR),
            ("DURATION", f"{total_time:.2f}s", "0F172A", "38BDF8"),
            ("READINESS", "PASS (READY)" if failed == 0 else "FAIL", "064E3B" if failed == 0 else "7F1D1D", self.PASS_COLOR if failed == 0 else self.FAIL_COLOR)
        ]

        col_letters = ["A", "B", "C", "D", "E", "F"]
        for idx, (label, val, bg_color, text_color) in enumerate(kpi_metrics):
            c_label = f"{col_letters[idx]}6"
            c_val = f"{col_letters[idx]}7"
            
            ws[c_label].value = label
            ws[c_label].font = Font(name="Segoe UI", size=9, bold=True, color="64748B")
            ws[c_label].fill = PatternFill(start_color=self.CARD_BG, end_color=self.CARD_BG, fill_type="solid")
            ws[c_label].alignment = Alignment(horizontal="center", vertical="center")
            ws[c_label].border = thin_border
            
            ws[c_val].value = val
            ws[c_val].font = Font(name="Segoe UI", size=14, bold=True, color=text_color)
            ws[c_val].fill = PatternFill(start_color=self.CARD_BG, end_color=self.CARD_BG, fill_type="solid")
            ws[c_val].alignment = Alignment(horizontal="center", vertical="center")
            ws[c_val].border = thin_border

        ws.row_dimensions[6].height = 18
        ws.row_dimensions[7].height = 26

        # Detailed Breakdown Table
        start_row = 10
        ws.merge_cells(f"A{start_row}:G{start_row}")
        ws[f"A{start_row}"].value = "EXECUTION ATTRIBUTES & METADATA"
        ws[f"A{start_row}"].font = Font(name="Segoe UI", size=11, bold=True, color=self.TEXT_WHITE)
        ws[f"A{start_row}"].fill = PatternFill(start_color=self.BRAND_COLOR, end_color=self.BRAND_COLOR, fill_type="solid")
        ws[f"A{start_row}"].alignment = Alignment(horizontal="left", vertical="center", indent=1)

        metadata_rows = [
            ("Test Suite Name", self.suite_title),
            ("Primary Test Category", self.category_name),
            ("Target Environment", self.environment),
            ("Execution Timestamp", timestamp),
            ("Total Unique Test Cases", str(total)),
            ("Passed Test Count", str(passed)),
            ("Failed Test Count", str(failed)),
            ("Skipped / Blocked Count", f"{skipped} skipped, {blocked} blocked"),
            ("Overall Pass Percentage", f"{pass_rate:.2f}%"),
            ("Total Execution Time", f"{total_time:.3f} seconds"),
            ("Deployment Readiness Status", deployment_readiness),
            ("Audit Verdict", "PASSED — Production Quality Bar Met" if failed == 0 else "FAILED — Defects Require Resolution")
        ]

        curr_row = start_row + 1
        for key, val in metadata_rows:
            ws.merge_cells(f"A{curr_row}:B{curr_row}")
            ws.merge_cells(f"C{curr_row}:G{curr_row}")
            
            k_cell = ws[f"A{curr_row}"]
            k_cell.value = key
            k_cell.font = Font(name="Segoe UI", size=9, bold=True, color="334155")
            k_cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
            k_cell.border = thin_border
            
            v_cell = ws[f"C{curr_row}"]
            v_cell.value = val
            v_cell.font = Font(name="Segoe UI", size=9, bold=(key in ["Deployment Readiness Status", "Audit Verdict"]), 
                              color=(self.PASS_COLOR if "PASS" in val or "READY" in val else "0F172A"))
            v_cell.fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
            v_cell.border = thin_border
            curr_row += 1

        # Column widths
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 18
        ws.column_dimensions["D"].width = 18
        ws.column_dimensions["E"].width = 18
        ws.column_dimensions["F"].width = 18
        ws.column_dimensions["G"].width = 22

    def _build_results_sheet(self, ws, test_list: List[Dict[str, Any]]):
        ws.views.sheetView[0].showGridLines = True
        
        headers = [
            ("Test ID", 14),
            ("Category", 16),
            ("Test Name", 32),
            ("Objective", 40),
            ("Preconditions", 28),
            ("Steps", 38),
            ("Expected Result", 34),
            ("Actual Result", 34),
            ("Status", 12),
            ("Priority", 12),
            ("Severity", 12),
            ("Duration (s)", 14),
            ("Error / Failure Message", 26),
            ("Screenshot / Artifact", 22),
            ("Remarks", 24),
            ("Automation Status", 18)
        ]

        thin_border = Border(
            left=Side(style='thin', color=self.BORDER_COLOR),
            right=Side(style='thin', color=self.BORDER_COLOR),
            top=Side(style='thin', color=self.BORDER_COLOR),
            bottom=Side(style='thin', color=self.BORDER_COLOR)
        )

        # Header Row
        for col_idx, (header_name, col_width) in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header_name)
            cell.font = Font(name="Segoe UI", size=10, bold=True, color=self.TEXT_WHITE)
            cell.fill = PatternFill(start_color=self.HEADER_BG, end_color=self.HEADER_BG, fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = col_width

        ws.row_dimensions[1].height = 28

        # Data Rows
        for row_idx, r in enumerate(test_list, 2):
            status = str(r.get("status", "PASS")).upper()
            row_bg = self.ACCENT_BG if (row_idx % 2 == 0) else "FFFFFF"
            
            row_values = [
                r.get("test_id", f"TC-{row_idx-1:04d}"),
                r.get("category", "FUNCTIONAL"),
                r.get("name", "Test Case"),
                r.get("objective", "Verify system behavior"),
                r.get("preconditions", "System operational"),
                r.get("steps", "1. Execute test action"),
                r.get("expected", "Expected condition verified"),
                r.get("actual", "Actual result matches expected"),
                status,
                r.get("priority", "P1"),
                r.get("severity", "Medium"),
                f"{float(r.get('execution_time', 0.05) or 0.05):.3f}",
                r.get("error", "None"),
                r.get("screenshot", "N/A"),
                r.get("remarks", "Automated validation verified"),
                r.get("automation_status", "AUTOMATED")
            ]

            ws.row_dimensions[row_idx].height = 22

            for col_idx, val in enumerate(row_values, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.border = thin_border
                cell.fill = PatternFill(start_color=row_bg, end_color=row_bg, fill_type="solid")
                
                if col_idx in [1, 9, 10, 11, 12, 16]:
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

                if col_idx == 9:  # Status Column
                    if status == "PASS":
                        cell.font = Font(name="Segoe UI", size=10, bold=True, color=self.PASS_COLOR)
                    elif status == "FAIL":
                        cell.font = Font(name="Segoe UI", size=10, bold=True, color=self.FAIL_COLOR)
                    else:
                        cell.font = Font(name="Segoe UI", size=10, bold=True, color=self.WARN_COLOR)
                elif col_idx == 1:
                    cell.font = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
                else:
                    cell.font = Font(name="Segoe UI", size=9, color="334155")

