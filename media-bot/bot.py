"""بوت تيليجرام شخصي لتحميل المقاطع والصور.

يدعم: سناب شات، اكس، يوتيوب، انستجرام، تيك توك، فيس بوك.
البوت يرد فقط على المستخدمين المذكورين في ALLOWED_USER_IDS.
"""

import asyncio
import logging
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import yt_dlp
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO
)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("media-bot")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
ALLOWED_USER_IDS = {
    int(x) for x in re.split(r"[,\s]+", os.environ.get("ALLOWED_USER_IDS", "")) if x
}
# حد تيليجرام للبوتات 50 ميجا (أو 2000 مع سيرفر Bot API محلي عبر BOT_API_URL).
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "50"))
MAX_BYTES = MAX_FILE_MB * 1024 * 1024
COOKIES_FILE = os.environ.get("COOKIES_FILE", "")
BOT_API_URL = os.environ.get("BOT_API_URL", "")

URL_RE = re.compile(r"https?://\S+")
HEIGHTS = (720, 480, 360)  # نجرب جودة أقل إذا كان الملف أكبر من الحد
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
PHOTO_MAX_BYTES = 10 * 1024 * 1024  # حد تيليجرام للصور المرسلة كصورة


class TooLarge(Exception):
    pass


def _files_in(folder: Path) -> list[Path]:
    return sorted(
        p
        for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() not in {".part", ".ytdl", ".json"}
    )


def _ytdlp(url: str, folder: Path, height: int) -> list[Path]:
    opts = {
        "outtmpl": str(folder / "%(id)s_%(autonumber)s.%(ext)s"),
        "format": "bv*+ba/b",
        # h264/aac حتى يشتغل المقطع مباشرة على الايفون
        "format_sort": [f"res:{height}", "vcodec:h264", "acodec:aac"],
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "retries": 3,
    }
    if COOKIES_FILE:
        opts["cookiefile"] = COOKIES_FILE
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    return _files_in(folder)


def _gallery_dl(url: str, folder: Path) -> list[Path]:
    cmd = [sys.executable, "-m", "gallery_dl", "-D", str(folder)]
    if COOKIES_FILE:
        cmd += ["--cookies", COOKIES_FILE]
    subprocess.run(cmd + [url], capture_output=True, timeout=300, check=False)
    return _files_in(folder)


def download(url: str, folder: Path) -> list[Path]:
    """ينزّل محتوى الرابط ويرجع قائمة الملفات. يشتغل في thread منفصل."""
    error: Exception | None = None
    too_large = False
    for i, height in enumerate(HEIGHTS):
        sub = folder / f"v{i}"
        sub.mkdir()
        try:
            files = _ytdlp(url, sub, height)
        except yt_dlp.utils.DownloadError as exc:
            error = exc
            break
        if not files:
            break
        if all(f.stat().st_size <= MAX_BYTES for f in files):
            return files
        too_large = True
        for f in files:
            f.unlink()

    if too_large:
        raise TooLarge()

    # منشورات الصور (انستجرام، اكس، تيك توك) ما يدعمها yt-dlp
    sub = folder / "g"
    sub.mkdir()
    files = [f for f in _gallery_dl(url, sub) if f.stat().st_size <= MAX_BYTES]
    if files:
        return files
    raise error or RuntimeError("ما لقيت محتوى قابل للتحميل في هذا الرابط")


def _allowed(update: Update) -> bool:
    user = update.effective_user
    return bool(user and user.id in ALLOWED_USER_IDS)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _allowed(update):
        # نعرض الرقم حتى يقدر صاحب البوت يضيفه في الإعدادات
        await update.message.reply_text(
            f"هذا بوت خاص.\nرقم حسابك: {user.id}"
        )
        return
    await update.message.reply_text(
        "أرسل رابط مقطع أو صورة من:\n"
        "سناب شات، اكس، يوتيوب، انستجرام، تيك توك، فيس بوك"
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return  # تجاهل تام لأي شخص غير مصرح له
    message = update.message
    urls = URL_RE.findall(message.text or "")
    if not urls:
        await message.reply_text("أرسل رابط صحيح.")
        return

    for url in urls:
        status = await message.reply_text("جاري التحميل…")
        with tempfile.TemporaryDirectory() as tmp:
            try:
                files = await asyncio.to_thread(download, url, Path(tmp))
            except TooLarge:
                await status.edit_text(
                    f"المقطع أكبر من {MAX_FILE_MB} ميجا حتى بأقل جودة."
                )
                continue
            except Exception as exc:  # noqa: BLE001
                log.warning("download failed for %s: %s", url, exc)
                reason = re.sub(r"\x1b\[[0-9;]*m", "", str(exc))[:300]
                await status.edit_text(f"ما قدرت أحمّل الرابط.\n{reason}")
                continue

            await status.edit_text("جاري الإرسال…")
            failed = 0
            for path in files:
                try:
                    await _send(message, path)
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    log.warning("send failed for %s: %s", path.name, exc)
            if failed:
                await status.edit_text(f"تعذر إرسال {failed} من {len(files)} ملف.")
            else:
                await status.delete()


async def _send(message, path: Path) -> None:
    ext = path.suffix.lower()
    with path.open("rb") as fh:
        if ext in VIDEO_EXT:
            await message.chat.send_action(ChatAction.UPLOAD_VIDEO)
            await message.reply_video(fh, supports_streaming=True)
        elif ext in IMAGE_EXT and path.stat().st_size <= PHOTO_MAX_BYTES:
            await message.reply_photo(fh)
        else:
            await message.reply_document(fh, filename=path.name)


def main() -> None:
    if not BOT_TOKEN:
        sys.exit("BOT_TOKEN غير موجود. انسخ .env.example إلى .env وعبّئه.")
    if not ALLOWED_USER_IDS:
        log.warning(
            "ALLOWED_USER_IDS فاضي: البوت ما راح يحمّل لأي أحد. "
            "أرسل /start للبوت لمعرفة رقم حسابك."
        )
    builder = (
        Application.builder()
        .token(BOT_TOKEN)
        .concurrent_updates(True)
        .read_timeout(120)
        .write_timeout(600)
        .media_write_timeout(600)
    )
    if BOT_API_URL:
        builder = builder.base_url(f"{BOT_API_URL.rstrip('/')}/bot").local_mode(True)
    app = builder.build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
