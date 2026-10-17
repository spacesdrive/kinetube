#!/usr/bin/env python3
"""Read an Instagram profile's posts with instaloader and report them to KineTube.

The backend sends one JSON line:
  {"username": "target", "session_username": "me", "sessions_dir": "/path", "max_posts": 500}

The script answers with JSON lines:
  {"type": "profile", "channelName": "...", "username": "...", "mediacount": N, "avatar": "..."}
  {"type": "progress", "fetched": N, "mediacount": M}            one per post
  {"type": "done", "status": "success", "posts": [...], "truncated": bool}
  {"type": "done", "status": "error", "message": "..."}
"""

import io
import json
import os
import sys
import time
from typing import Any

# Windows defaults to cp1252, which crashes on non-Latin captions
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# five posts failing in a row means Instagram has started refusing requests
MAX_FAILURES_IN_A_ROW = 5
# a short pause after a failed post usually gets past a burst limit
RETRY_PAUSE_SECONDS = 2
# the card shows the start of the caption, not all of it
TITLE_LENGTH = 120


def emit(message: dict[str, Any]) -> None:
    print(json.dumps(message, ensure_ascii=False), flush=True)


def fail(message: str) -> None:
    emit({'type': 'done', 'status': 'error', 'message': message})


def load_session(loader: Any, session_username: str, sessions_dir: str) -> None:
    """Use a saved login when there is one; logged-in requests are rate-limited far less."""
    session_file = os.path.join(sessions_dir, f'session-{session_username}')
    if not session_username or not os.path.exists(session_file):
        return
    try:
        loader.load_session_from_file(session_username, filename=session_file)
    except (OSError, ValueError) as error:
        # an expired or unreadable session still lets public profiles load anonymously
        print(f'could not load the saved session: {error}', file=sys.stderr)


def post_summary(post: Any) -> dict[str, Any]:
    """{"shortcode": "ABC", "title": "first 120 characters of the caption", ...}"""
    caption = (post.caption or '').strip()
    return {
        'id': post.shortcode,
        'shortcode': post.shortcode,
        'title': caption[:TITLE_LENGTH] if caption else 'Untitled',
        'url': f'https://www.instagram.com/p/{post.shortcode}/',
        'thumbnail': post.url,
        'duration': None,
        'viewCount': getattr(post, 'video_view_count', None),
        'likeCount': post.likes,
        'isVideo': post.is_video,
    }


def collect_posts(profile: Any, max_posts: int) -> list[dict[str, Any]]:
    posts: list[dict[str, Any]] = []
    failures_in_a_row = 0

    for post in profile.get_posts():
        if len(posts) >= max_posts or failures_in_a_row >= MAX_FAILURES_IN_A_ROW:
            break
        try:
            posts.append(post_summary(post))
        # instaloader raises many kinds of errors for a single bad post; skip it and keep going
        except Exception as error:  # noqa: BLE001
            failures_in_a_row += 1
            print(f'skipped a post: {error}', file=sys.stderr)
            time.sleep(RETRY_PAUSE_SECONDS)
            continue
        failures_in_a_row = 0
        emit({'type': 'progress', 'fetched': len(posts), 'mediacount': profile.mediacount})
    return posts


def read_profile(instaloader: Any, request: dict[str, Any]) -> None:
    username = str(request['username'])
    max_posts = int(request.get('max_posts', 500))
    loader = instaloader.Instaloader(download_video_thumbnails=False, save_metadata=False, quiet=True, max_connection_attempts=3)
    load_session(loader, str(request.get('session_username', '')), str(request.get('sessions_dir', '')))
    exceptions = instaloader.exceptions

    try:
        profile = instaloader.Profile.from_username(loader.context, username)
        # sent first so the app can show the name and avatar while posts load
        emit({
            'type': 'profile',
            'channelName': profile.full_name or username,
            'username': username,
            'mediacount': profile.mediacount,
            'avatar': profile.profile_pic_url,
        })
        posts = collect_posts(profile, max_posts)
        emit({'type': 'done', 'status': 'success', 'posts': posts, 'truncated': len(posts) >= max_posts})
    except exceptions.ProfileNotExistsException:
        fail(f'The profile @{username} does not exist.')
    except exceptions.LoginRequiredException:
        fail(f'The profile @{username} is private. Log in to an Instagram account first.')
    except exceptions.PrivateProfileNotFollowedException:
        fail(f'@{username} is private. Follow them from your logged-in account to see their posts.')
    except exceptions.InstaloaderException as error:
        fail(str(error))


def main() -> None:
    try:
        import instaloader
    except ImportError:
        fail('The instaloader library is not installed. Run: pip install instaloader')
        return

    try:
        request = json.loads(sys.stdin.readline())
        if not isinstance(request, dict) or 'username' not in request:
            raise ValueError('expected an object with a username')
    except (ValueError, json.JSONDecodeError) as error:
        fail(f'The profile request could not be read: {error}')
        return

    read_profile(instaloader, request)


if __name__ == '__main__':
    main()
