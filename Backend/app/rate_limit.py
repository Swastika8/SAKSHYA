"""Bounded, ephemeral quota counters; no raw IPs, content, logs or database."""

from collections import OrderedDict, deque
import hashlib
import hmac
import os
import secrets
import time
from threading import Lock


class Quota:
    def __init__(self, limit=10, window=60, capacity=4096):
        self.limit, self.window, self.capacity = limit, window, capacity
        self.salt = secrets.token_bytes(32)
        self.buckets = OrderedDict()
        self.lock = Lock()

    def allow(self, ip: str) -> bool:
        key = hmac.new(self.salt, ip.encode(), hashlib.sha256).digest()
        now = time.monotonic()
        with self.lock:
            # Fixed-window inactivity eviction bounds memory without keeping IPs.
            for stale in [
                k
                for k, v in self.buckets.items()
                if not v or v[-1] <= now - self.window
            ]:
                self.buckets.pop(stale, None)
            if key not in self.buckets:
                if len(self.buckets) >= self.capacity:
                    return False  # fail to mock instead of evicting active quotas
                self.buckets[key] = deque()
            events = self.buckets[key]
            while events and events[0] <= now - self.window:
                events.popleft()
            if len(events) >= self.limit:
                return False
            events.append(now)
            return True


quota = Quota(limit=max(1, int(os.getenv("AI_REQUESTS_PER_MINUTE", "10"))))
