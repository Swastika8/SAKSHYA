"""Choose a loopback address on the required port without stopping other apps."""

import socket


def choose():
    for family, host in [(socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")]:
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.bind((host, 8000))
            return host
        except OSError:
            continue
    raise SystemExit(
        "Port 8000 is occupied on both loopback addresses. Close the conflicting service or use an explicitly configured alternative."
    )


if __name__ == "__main__":
    print(choose())
