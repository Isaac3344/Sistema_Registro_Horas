from __future__ import annotations

from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

def export_pdf(rows: list[dict]) -> bytes:
    """PDF simple estilo reporte. (Se puede mejorar con tabla, pero esto ya sirve en empresa)."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    w, h = landscape(A4)

    c.setTitle("Reporte de Jornadas")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, h-30, "Reporte de Jornadas (Registro de Personal)")
    c.setFont("Helvetica", 10)
    c.drawString(30, h-48, f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    y = h - 75
    headers = ["Nombre", "Fecha", "Entrada", "Salida", "Almuerzo(min)", "Centro de costo", "Descripción", "Horas"]
    col_x = [30, 170, 250, 315, 380, 470, 650, 980]  # ancho landscape A4 ~ 842pt; but using landscape (w ~ 842). We'll keep within bounds.
    # Fix to fit: compute based on w
    col_x = [30, 170, 250, 315, 390, 480, 620, w-80]

    c.setFont("Helvetica-Bold", 9)
    for x, t in zip(col_x, headers):
        c.drawString(x, y, t)
    c.line(30, y-4, w-30, y-4)
    y -= 18
    c.setFont("Helvetica", 8)

    for r in rows:
        if y < 40:
            c.showPage()
            y = h - 40
            c.setFont("Helvetica", 8)

        desc = (r.get("description") or "").replace("\n", " ")
        if len(desc) > 80:
            desc = desc[:77] + "..."

        cc = (r.get("cost_center") or "")
        if len(cc) > 30:
            cc = cc[:27] + "..."

        values = [
            r.get("worker_name",""),
            str(r.get("work_date","")),
            str(r.get("entry_time","")),
            str(r.get("exit_time","")),
            str(r.get("lunch_minutes","")),
            cc,
            desc,
            str(r.get("total_hours","")),
        ]
        for x, t in zip(col_x, values):
            c.drawString(x, y, t)
        y -= 14

    c.showPage()
    c.save()
    return buf.getvalue()
