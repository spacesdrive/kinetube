#!/usr/bin/env python3
"""Log in to Instagram with instaloader and save the session file KineTube uses.

The backend talks to this script with one JSON object per line:

  backend -> script: {"username": "...", "password": "...", "sessions_dir": "..."}
  script -> backend: {"status": "success"}
                   | {"status": "twofa_required"}
                   | {"status": "error", "message": "..."}

After "twofa_required" the backend sends {"code": "123456"} and the script answers once more
with "success" or "error".
"""

import io
import json
import os
import sys
from typing import Any

# Windows defaults to cp1252, which crashes on non-Latin usernames
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

SUSPICIOUS_LOGIN_MESSAGE = (
    'Instagram blocked this login as suspicious. Open Instagram on your phone, '
    'approve the login notification, then try again.'
)
VERIFICATION_MESSAGE = 'Instagram wants to verify the account. Finish the check in the Instagram app first.'


def emit(message: dict[str, Any]) -> None:
    print(json.dumps(message, ensure_ascii=False), flush=True)


def read_message() -> dict[str, Any]:
    line = sys.stdin.readline()
    if not line:
        raise ValueError('the backend closed the connection before sending anything')
    message = json.loads(line)
    if not isinstance(message, dict):
        raise ValueError('expected a JSON object')
    return message


def session_path(sessions_dir: str, username: str) -> str:
    # the backend's account store looks for exactly this name
    return os.path.join(sessions_dir, f'session-{username}')


def connection_error_message(error: Exception) -> str:
    text = str(error).lower()
    if any(word in text for word in ('checkpoint', 'suspicious', 'unusual')):
        return SUSPICIOUS_LOGIN_MESSAGE
    if 'challenge' in text or 'verify' in text:
        return VERIFICATION_MESSAGE
    return f'Instagram could not be reached: {error}'


def finish_two_factor(loader: Any, username: str, sessions_dir: str) -> None:
    emit({'status': 'twofa_required'})
    code = str(read_message().get('code', ''))
    loader.two_factor_login(code)
    loader.save_session_to_file(session_path(sessions_dir, username))
    emit({'status': 'success'})


def log_in(instaloader: Any, credentials: dict[str, Any]) -> None:
    username = str(credentials['username'])
    sessions_dir = str(credentials['sessions_dir'])
    loader = instaloader.Instaloader()
    exceptions = instaloader.exceptions

    try:
        loader.login(username, str(credentials['password']))
        loader.save_session_to_file(session_path(sessions_dir, username))
        emit({'status': 'success'})
    except exceptions.TwoFactorAuthRequiredException:
        try:
            finish_two_factor(loader, username, sessions_dir)
        except (exceptions.InstaloaderException, ValueError) as error:
            emit({'status': 'error', 'message': f"Instagram didn't accept the code: {error}"})
    except exceptions.BadCredentialsException:
        emit({'status': 'error', 'message': 'The username or password is wrong.'})
    except exceptions.ConnectionException as error:
        emit({'status': 'error', 'message': connection_error_message(error)})
    except exceptions.InstaloaderException as error:
        emit({'status': 'error', 'message': str(error)})


def main() -> None:
    try:
        import instaloader
    except ImportError:
        emit({'status': 'error', 'message': 'The instaloader library is not installed. Run: pip install instaloader'})
        return

    try:
        credentials = read_message()
        missing = [key for key in ('username', 'password', 'sessions_dir') if key not in credentials]
        if missing:
            raise ValueError(f'missing {", ".join(missing)}')
    except (ValueError, json.JSONDecodeError) as error:
        emit({'status': 'error', 'message': f'The login request could not be read: {error}'})
        return

    log_in(instaloader, credentials)


if __name__ == '__main__':
    main()
