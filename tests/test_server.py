import unittest
from unittest.mock import patch

import server


class RelayRequestTests(unittest.TestCase):
    def test_relay_adds_browser_user_agent_for_upstream_requests(self) -> None:
        target = (
            "https://www.inroi.shop/chat/completions",
            "POST",
            {"Authorization": "Bearer redacted", "Content-Type": "application/json"},
            b"{}",
        )

        with patch("server.urllib.request.urlopen") as urlopen:
            server.LocalHandler._open_upstream(target)

        request = urlopen.call_args.args[0]
        self.assertEqual(
            request.get_header("User-agent"),
            server.DEFAULT_USER_AGENT,
        )
        self.assertTrue(request.get_header("User-agent").startswith("Mozilla/5.0"))
