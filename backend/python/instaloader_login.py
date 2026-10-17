#!/usr/bin/env python3
"""
instaloader_login.py — KineTube login helper

Uses the instaloader Python library (pip install instaloader) to log in
interactively and save the session file, which KineTube can then load for
authenticated downloads.

Communication protocol with the Node.js host (stdin/stdout, JSON lines):

  Node → Python:  {"username": "...", "password": "...", "sessions_dir": "..."}
  Python → Node:  {"status": "success"}
                | {"status": "twofa_required"}
                | {"status": "error", "message": "..."}

  If twofa_required, Node sends:
  Node → Python:  {"code": "123456"}
  Python → Node:  {"status": "success"}
                | {"status": "error", "message": "..."}
"""

import sys
import io
import json
import os

# Force UTF-8 on stdout/stderr — Windows defaults to cp1252 which crashes on
# non-Latin characters in usernames, captions, etc.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)


def main():
    # Check that instaloader is importable
    try:
        import instaloader
    except ImportError:
        emit({
            'status': 'error',
            'message': (
                'instaloader Python library not found. '
                'Run: pip install instaloader'
            )
        })
        return

    # Read credentials from Node
    try:
        raw = sys.stdin.readline()
        if not raw:
            emit({'status': 'error', 'message': 'No input from host'})
            return
        data = json.loads(raw.strip())
        username     = data['username']
        password     = data['password']
        sessions_dir = data['sessions_dir']
    except Exception as exc:
        emit({'status': 'error', 'message': f'Bad input: {exc}'})
        return

    L = instaloader.Instaloader()

    try:
        L.login(username, password)
        # Session saved — same naming convention as instaloaderManager.js
        session_path = os.path.join(sessions_dir, f'session-{username}')
        L.save_session_to_file(session_path)
        emit({'status': 'success'})

    except instaloader.exceptions.TwoFactorAuthRequiredException:
        emit({'status': 'twofa_required'})

        try:
            code_raw  = sys.stdin.readline()
            code_data = json.loads(code_raw.strip())
            L.two_factor_login(code_data['code'])
            session_path = os.path.join(sessions_dir, f'session-{username}')
            L.save_session_to_file(session_path)
            emit({'status': 'success'})
        except Exception as exc:
            emit({'status': 'error', 'message': str(exc)})

    except instaloader.exceptions.BadCredentialsException:
        emit({'status': 'error', 'message': 'Incorrect username or password.'})

    except instaloader.exceptions.ConnectionException as exc:
        msg = str(exc).lower()
        if 'checkpoint' in msg or 'suspicious' in msg or 'unusual' in msg:
            emit({
                'status': 'error',
                'message': (
                    'Instagram blocked this login attempt as suspicious. '
                    'Open Instagram on your phone, approve the login '
                    'notification, then try again.'
                )
            })
        elif 'challenge' in msg or 'verify' in msg:
            emit({
                'status': 'error',
                'message': (
                    'Instagram requires account verification. '
                    'Complete the verification in the Instagram app first.'
                )
            })
        else:
            emit({'status': 'error', 'message': f'Connection error: {exc}'})

    except Exception as exc:
        emit({'status': 'error', 'message': str(exc)})


if __name__ == '__main__':
    main()
