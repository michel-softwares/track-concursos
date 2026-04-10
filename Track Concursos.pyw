"""
Launcher sem terminal para Windows.
Abra este arquivo para iniciar o Track Concursos sem a janela do CMD.
"""

import ctypes
import traceback


def show_error(message):
    try:
        ctypes.windll.user32.MessageBoxW(0, message, "Track Concursos", 0x10)
    except Exception:
        pass


if __name__ == '__main__':
    try:
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
