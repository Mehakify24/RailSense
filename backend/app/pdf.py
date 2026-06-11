from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def incident_pdf(incident, sensor_rows: list) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Incident Report {incident.id}")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("SHINKANSEN BRAIN BLACK BOX REPORT", styles["Title"]),
        Spacer(1, 14),
        Paragraph(f"Incident #{incident.id} - {incident.incident_type}", styles["Heading2"]),
        Paragraph(f"Timestamp: {incident.timestamp.isoformat()} UTC", styles["BodyText"]),
        Paragraph(f"Location: {incident.location}", styles["BodyText"]),
        Paragraph(f"Severity: {incident.severity}", styles["BodyText"]),
        Spacer(1, 12),
        Paragraph("Cause", styles["Heading3"]),
        Paragraph(incident.cause, styles["BodyText"]),
        Paragraph("AI Reasoning", styles["Heading3"]),
        Paragraph(incident.reasoning.replace("\n", "<br/>"), styles["BodyText"]),
        Paragraph("Action Taken", styles["Heading3"]),
        Paragraph(incident.action_taken, styles["BodyText"]),
        Paragraph("Affected Trains", styles["Heading3"]),
        Paragraph(incident.affected_trains or "No active trains affected.", styles["BodyText"]),
        Paragraph("Timeline", styles["Heading3"]),
        Paragraph(incident.timeline.replace("\n", "<br/>"), styles["BodyText"]),
        Spacer(1, 12),
        Paragraph("Nearby Sensor Values", styles["Heading3"]),
    ]
    table_data = [["Time", "Sensor", "Value", "Status"]]
    for row in sensor_rows[:18]:
        table_data.append([
            row.timestamp.strftime("%H:%M:%S"),
            row.sensor_type.replace("_", " "),
            f"{row.value} {row.unit}",
            row.status,
        ])
    table = Table(table_data, colWidths=[85, 145, 110, 80])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#060B10")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#94A3B8")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#EAF9FF")]),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buffer.getvalue()
