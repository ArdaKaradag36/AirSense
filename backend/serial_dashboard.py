#!/usr/bin/env python3
"""
AirSense Serial Dashboard
ESP32'den gelen serial veriyi okur ve gerçek zamanlı çizim gösterir.
Kullanım: python3 serial_dashboard.py
"""
import re
import sys
import time
import threading
from collections import deque

import matplotlib
matplotlib.use("TkAgg")
import serial
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.gridspec import GridSpec

PORT = "/dev/ttyUSB0"
BAUD = 115200

mq135_values: deque = deque(maxlen=60)
log_lines: deque = deque(maxlen=20)
ser = None
connection_status = {"connected": False, "error": ""}


def read_serial():
    global ser
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1)
        connection_status["connected"] = True
        log_lines.append(f"[BAĞLANDI] {PORT}  @  {BAUD} baud")
    except serial.SerialException as e:
        connection_status["connected"] = False
        connection_status["error"] = str(e)
        log_lines.append(f"[HATA] {e}")
        return

    mq_pattern = re.compile(r'MQ-135:\s*(\d+)')

    while True:
        try:
            raw = ser.readline()
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            log_lines.append(line)
            m = mq_pattern.search(line)
            if m:
                mq135_values.append(int(m.group(1)))
        except serial.SerialException as e:
            log_lines.append(f"[KESİLDİ] {e}")
            connection_status["connected"] = False
            break
        except Exception as e:
            log_lines.append(f"[HATA] {e}")
            time.sleep(0.2)


def air_quality(val: int) -> tuple[str, str]:
    if val < 600:
        return "TEMİZ", "#00e676"
    elif val < 900:
        return "İYİ", "#69f0ae"
    elif val < 1200:
        return "ORTA", "#ffab40"
    else:
        return "TEHLİKELİ", "#ff1744"


def animate(frame, ax_chart, ax_bar, ax_log):
    ax_chart.clear()
    ax_bar.clear()
    ax_log.clear()

    bg = "#0d1117"
    grid_color = "#1e2733"

    for ax in (ax_chart, ax_bar, ax_log):
        ax.set_facecolor(bg)
        for spine in ax.spines.values():
            spine.set_color("#2a3444")

    vals = list(mq135_values)

    # ── Çizgi grafik ──────────────────────────────────────────
    if vals:
        xs = list(range(len(vals)))
        label_str, line_color = air_quality(vals[-1])

        ax_chart.plot(xs, vals, color=line_color, linewidth=2.2, zorder=3)
        ax_chart.fill_between(xs, vals, alpha=0.18, color=line_color, zorder=2)
        ax_chart.axhline(1200, color="#ff1744", linewidth=1, linestyle="--",
                         alpha=0.6, label="Tehlike Eşiği (1200)")
        ax_chart.axhline(900, color="#ffab40", linewidth=1, linestyle=":",
                         alpha=0.5, label="Orta Eşik (900)")
        ax_chart.set_ylim(0, max(1600, max(vals) + 150))
        ax_chart.legend(facecolor="#131a24", labelcolor="white",
                        fontsize=8, loc="upper left")
    else:
        ax_chart.text(0.5, 0.5, "Sensör verisi bekleniyor…",
                      ha="center", va="center", color="#55667a",
                      transform=ax_chart.transAxes, fontsize=12)

    ax_chart.set_title("MQ-135  Hava Kalitesi  (Ham Değer)", color="white",
                       fontsize=13, pad=10)
    ax_chart.set_ylabel("Ham Değer", color="#8899aa")
    ax_chart.set_xlabel("Örnek #", color="#8899aa")
    ax_chart.tick_params(colors="#667788")
    ax_chart.grid(color=grid_color, linewidth=0.5, zorder=1)

    # ── Şu anki değer (yatay bar) ──────────────────────────────
    current = vals[-1] if vals else 0
    label_str, bar_color = air_quality(current)

    ax_bar.barh([0], [current], color=bar_color, height=0.5, zorder=3)
    ax_bar.barh([0], [2000], color="#1e2733", height=0.5, zorder=2)   # arka plan şerit
    ax_bar.set_xlim(0, 2000)
    ax_bar.set_yticks([])
    ax_bar.tick_params(colors="#667788")
    ax_bar.grid(axis="x", color=grid_color, linewidth=0.5, zorder=1)

    status_title = (f"Şu An: {current}   ►  {label_str}"
                    if current else "Bekleniyor…")
    ax_bar.set_title(status_title, color=bar_color, fontsize=13,
                     fontweight="bold", pad=8)

    # ── Serial log ────────────────────────────────────────────
    lines = list(log_lines)
    text = "\n".join(lines) if lines else "Serial log bekleniyor…"

    conn_color = "#00e676" if connection_status["connected"] else "#ff1744"
    conn_icon  = "●" if connection_status["connected"] else "✖"
    ax_log.set_title(
        f"{conn_icon}  Serial Log   {PORT}  @  {BAUD}",
        color=conn_color, fontsize=10, pad=6
    )
    ax_log.text(0.01, 0.98, text, va="top", ha="left",
                transform=ax_log.transAxes, color="#8fbc8f",
                fontsize=8, fontfamily="monospace",
                bbox=dict(facecolor=bg, alpha=0))
    ax_log.set_xticks([])
    ax_log.set_yticks([])


def main():
    # Seri okumayı arka planda başlat
    thread = threading.Thread(target=read_serial, daemon=True)
    thread.start()

    plt.style.use("dark_background")
    fig = plt.figure(figsize=(15, 8), facecolor="#0d1117")
    try:
        fig.canvas.manager.set_window_title("AirSense  –  Donanım İzleme")
    except Exception:
        pass

    gs = GridSpec(3, 2, figure=fig, hspace=0.5, wspace=0.35,
                  left=0.06, right=0.97, top=0.91, bottom=0.08)
    ax_chart = fig.add_subplot(gs[0:2, 0])
    ax_bar   = fig.add_subplot(gs[2,   0])
    ax_log   = fig.add_subplot(gs[:,   1])

    fig.suptitle("AirSense  |  ESP32 Donanım İzleme  (MQ-135 + DHT11)",
                 color="#4fc3f7", fontsize=15, fontweight="bold")

    ani = animation.FuncAnimation(   # noqa: F841  (referans tutulmalı)
        fig, animate,
        fargs=(ax_chart, ax_bar, ax_log),
        interval=800,
        cache_frame_data=False,
    )

    try:
        plt.show()
    except KeyboardInterrupt:
        pass
    finally:
        if ser and ser.is_open:
            ser.close()
            print("Seri port kapatıldı.")


if __name__ == "__main__":
    # dialout grubunda değilse sudo ile çalıştır
    import os, stat as _stat
    try:
        mode = os.stat(PORT).st_mode
        if not os.access(PORT, os.R_OK | os.W_OK):
            print(f"[UYARI] {PORT} erişim izni yok.")
            print("Çözüm: terminalde şunu çalıştır → sudo chmod 666 /dev/ttyUSB0")
            print("       Ya da bir kerelik: sudo usermod -aG dialout $USER  (logout gerekli)")
    except FileNotFoundError:
        print(f"[HATA] {PORT} bulunamadı. USB kablosunu kontrol et.")
        sys.exit(1)

    main()
