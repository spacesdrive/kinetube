# kinetube user guide

How to set kinetube up, where it keeps things, and what it can't do yet. For an overview of the app, see the [README](../README.md).

## First start

kinetube needs an internet connection the first time it starts. The setup screen installs yt-dlp, which reads and downloads the media, and FFmpeg, which merges video and audio and converts to MP3. Both come from their official release hosts.

Two more tools are installed the first time you need them:

| Tool | Installed when | Needs |
|---|---|---|
| whisper.cpp | You open Transcribe and choose to install it | On macOS and Linux it is built from source, which needs `git`, `cmake` and a C/C++ compiler |
| instaloader | You log in to Instagram or open a profile | Python 3 with pip on your `PATH` |

Whisper models are downloaded from Hugging Face when you pick one, from Tiny (about 75 MB) to Large (about 2.9 GB).

## Where files go

- **Downloads and transcripts** go to your download folder. When none is set, kinetube uses a `downloads` folder inside its own data folder. A transcript is saved next to the file it came from, as a `.txt` file unless Settings picks other formats. In a bulk download each file is transcribed right after it downloads, and the progress window stays open until the last transcript is saved.
- **Tools, models, Instagram sessions and unfinished downloads** live in the app's data folder (Electron's `userData`), so an update never touches them.
- **Settings** are saved in the app itself and survive restarts and updates.

## Settings

| Setting | What it does |
|---|---|
| Theme | Light, dark, or match the system. It changes at once, without Save. |
| Download folder | Where files are saved |
| Default quality | The quality each page starts with |
| Numbering | Adds a sequence number to each file name |
| Prefix and suffix | Text added before or after every file name |
| Custom file name | A yt-dlp template, such as `%(title)s`, `%(uploader)s`, `%(upload_date)s` or `%(id)s` |
| Default Whisper model | Tiny, Base, Small, Medium or Large |
| Transcription language | Detect automatically, or one of 12 languages |
| Transcript files | The files saved beside a transcribed file: TXT (one paragraph), SRT and VTT subtitles, LRC lyrics, CSV and TSV tables, and JSON. At least one stays on. SRT and VTT open as subtitles in most video players. |

The YouTube and Instagram pages also have a Download options panel. It changes the folder and the file names for this session only and leaves the saved defaults alone.

## Instagram

Public posts and reels need no setup. Logging in and opening profiles use instaloader, which needs Python 3 on your `PATH`. When kinetube finds Python, it offers to run `pip install instaloader` for you. You can also install it yourself:

```bash
pip install instaloader
```

Then log in from the sidebar on the Instagram page. Two-factor authentication works, and you can add several accounts and switch between them. Removing an account asks you to press and hold, so it can't happen by accident.

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Open or close the command palette | <kbd>Ctrl</kbd> <kbd>K</kbd> (<kbd>Cmd</kbd> <kbd>K</kbd> on macOS) |
| Move through the commands | <kbd>Up</kbd> and <kbd>Down</kbd> |
| Run the highlighted command | <kbd>Enter</kbd> |
| Look up the pasted link | <kbd>Enter</kbd> in the link field |
| Confirm a removal | Hold <kbd>Space</kbd> or <kbd>Enter</kbd> on a "Hold to" button |
| Open or close the developer tools | <kbd>F12</kbd> |

## Privacy

- kinetube has no server of its own, no account and no telemetry.
- It contacts YouTube and Instagram (with their image servers for thumbnails), and the hosts it installs tools and models from: GitHub, the FFmpeg build hosts, Hugging Face, and PyPI through pip.
- The fonts ship inside the app, so no page loads anything from a font service.
- The local server listens on `127.0.0.1` only. It refuses requests from other web pages and other host names, so a website you visit can't use it.

## Known limitations

- **Instagram downloads run logged out.** instaloader saves its session in a format yt-dlp can't read, so post lookups and downloads don't use your login. Content that Instagram only shows to logged-in visitors can't be downloaded yet. Profiles do use the saved session.
- **macOS and Linux aren't verified on real hardware.** The tool setup for both is implemented and unit tested, but hasn't been run end to end on a real Mac or Linux machine. See [Cross-platform status](philosophy/CROSS_PLATFORM.md).
- **FFmpeg on Apple Silicon runs under Rosetta 2.** The FFmpeg build kinetube downloads for macOS is x64 only.
- **Only x64 Linux is supported.** The Linux yt-dlp, FFmpeg and AppImage builds are x64.
- **Starting kinetube from a VS Code terminal can fail.** That terminal sets `ELECTRON_RUN_AS_NODE=1`, and the installed app then exits at once. Start it from the Start menu or the desktop instead.

Something else wrong? Search the [issues](https://github.com/spacesdrive/kinetube/issues) or open a new one.
