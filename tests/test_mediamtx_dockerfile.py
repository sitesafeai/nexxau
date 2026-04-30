from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]


class MediaMTXDockerfileTest(unittest.TestCase):
    def test_copies_railway_config_from_repo_root(self):
        dockerfile = REPO_ROOT / "docker" / "mediamtx" / "Dockerfile"
        config = REPO_ROOT / "docker" / "mediamtx" / "mediamtx.yml"

        self.assertTrue(config.exists())
        self.assertIn(
            "COPY docker/mediamtx/mediamtx.yml /mediamtx.yml",
            dockerfile.read_text(),
        )

    def test_railway_config_enables_internal_auth(self):
        config_text = (REPO_ROOT / "docker" / "mediamtx" / "mediamtx.yml").read_text()

        self.assertIn('authMethod: "internal"', config_text)
        self.assertIn("authInternalUsers:", config_text)
        self.assertIn("- action: api", config_text)


if __name__ == "__main__":
    unittest.main()
