"""
Launcher sem terminal para Windows.
Abra este arquivo para iniciar o Track Concursos sem a janela do CMD.
"""

import ctypes
import traceback
import webbrowser
import winreg


WEBVIEW2_DOWNLOAD_URL = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703'
WEBVIEW2_REG_PATHS = (
    (winreg.HKEY_CURRENT_USER, r'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'),
    (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'),
    (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'),
)
WEBVIEW2_DIR_CANDIDATES = (
    r'C:\Program Files (x86)\Microsoft\EdgeWebView\Application',
    r'C:\Program Files\Microsoft\EdgeWebView\Application',
)


def show_error(message):
    try:
        ctypes.windll.user32.MessageBoxW(0, message, "Track Concursos", 0x10)
    except Exception:
        pass


def ask_yes_no(message):
    try:
        result = ctypes.windll.user32.MessageBoxW(0, message, "Track Concursos", 0x34)
        return result == 6
    except Exception:
        return False


def has_webview2_runtime():
    for root, reg_path in WEBVIEW2_REG_PATHS:
        try:
            with winreg.OpenKey(root, reg_path) as key:
                value, _ = winreg.QueryValueEx(key, 'pv')
                if str(value or '').strip():
                    return True
        except OSError:
            pass

    for path in WEBVIEW2_DIR_CANDIDATES:
        try:
            import os

            if os.path.isdir(path):
                return True
        except Exception:
            pass

    return False


if __name__ == '__main__':
    try:
        if not has_webview2_runtime():
            should_open = ask_yes_no(
                "O Microsoft Edge WebView2 Runtime nao foi encontrado.\n\n"
                "Ele e necessario para abrir a interface do Track Concursos.\n\n"
                "Deseja abrir a pagina oficial de download agora?"
            )
            if should_open:
                webbrowser.open(WEBVIEW2_DOWNLOAD_URL)
            raise RuntimeError(
                "Microsoft Edge WebView2 Runtime ausente. Instale o componente e abra o programa novamente."
            )

        from track_concursos_app import main
        main()
    except Exception as exc:
        details = ''.join(traceback.format_exception_only(type(exc), exc)).strip()
        show_error(
            "Nao foi possivel iniciar o Track Concursos.\n\n"
            + details
            + "\n\n"
            + "Se necessario, abra o README.md para revisar a instalacao."
        )
