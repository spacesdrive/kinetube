#!/usr/bin/env python3
"""
instaloader_profile.py — KineTube profile metadata helper

Reads one JSON line from stdin:
  { "username": "target", "session_username": "me", "sessions_dir": "/path", "max_posts": 500 }

Writes JSON lines to stdout:
  { "type": "profile",   "channelName": "...", "username": "...", "mediacount": N, "avatar": "..." }
  { "type": "progress",  "fetched": N, "mediacount": M }   -- one per post
  { "type": "done",      "status": "success", "posts": [...], "truncated": bool }
  { "type": "done",      "status": "error",   "message": "..." }
"""

import sys
import io
import json
import os
import time

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252 which crashes on
# non-Latin characters in usernames, captions, etc.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)


def main():
    try:
        import instaloader
    except ImportError:
        emit({'type': 'done', 'status': 'error', 'message': 'instaloader not installed. Run: pip install instaloader'})
        return

    try:
        raw  = sys.stdin.readline()
        data = json.loads(raw.strip())
        target_username  = data['username']
        session_username = data.get('session_username', '')
        sessions_dir     = data.get('sessions_dir', '')
        max_posts        = int(data.get('max_posts', 500))
    except Exception as exc:
        emit({'type': 'done', 'status': 'error', 'message': f'Bad input: {exc}'})
        return

    L = instaloader.Instaloader(
        download_video_thumbnails=False,
        save_metadata=False,
        quiet=True,
        max_connection_attempts=3,
    )

    # Load session to avoid rate-limiting
    if session_username and sessions_dir:
        session_file = os.path.join(sessions_dir, f'session-{session_username}')
        if os.path.exists(session_file):
            try:
                L.load_session_from_file(session_username, filename=session_file)
            except Exception:
                pass

    try:
        profile = instaloader.Profile.from_username(L.context, target_username)

        # Emit profile header immediately so the frontend can show the name/avatar
        emit({
            'type':          'profile',
            'channelName':   profile.full_name or target_username,
            'username':      target_username,
            'biography':     profile.biography or '',
            'mediacount':    profile.mediacount,
            'followerCount': profile.followers,
            'avatar':        profile.profile_pic_url,
        })

        posts  = []
        errors = 0
        for post in profile.get_posts():
            if len(posts) >= max_posts:
                break
            try:
                caption = (post.caption or '').strip()
                posts.append({
                    'id':        post.shortcode,
                    'shortcode': post.shortcode,
                    'title':     caption[:120] if caption else 'Untitled',
                    'url':       f'https://www.instagram.com/p/{post.shortcode}/',
                    'thumbnail': post.url,
                    'duration':  None,
                    'viewCount': getattr(post, 'video_view_count', None),
                    'likeCount': post.likes,
                    'isVideo':   post.is_video,
                })
                errors = 0
                # Emit progress after every post
                emit({'type': 'progress', 'fetched': len(posts), 'mediacount': profile.mediacount})
            except Exception:
                errors += 1
                if errors >= 5:
                    break
                time.sleep(2)
                continue

        emit({
            'type':      'done',
            'status':    'success',
            'posts':     posts,
            'truncated': len(posts) >= max_posts,
        })

    except instaloader.exceptions.ProfileNotExistsException:
        emit({'type': 'done', 'status': 'error', 'message': f'Profile @{target_username} does not exist.'})

    except instaloader.exceptions.LoginRequiredException:
        emit({'type': 'done', 'status': 'error', 'message': f'Profile @{target_username} is private. Log in to an Instagram account first.'})

    except instaloader.exceptions.PrivateProfileNotFollowedException:
        emit({'type': 'done', 'status': 'error', 'message': f'@{target_username} is private. You must follow them to see their posts.'})

    except Exception as exc:
        emit({'type': 'done', 'status': 'error', 'message': str(exc)})


if __name__ == '__main__':
    main()
