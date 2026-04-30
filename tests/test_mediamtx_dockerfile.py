from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_mediamtx_dockerfile_copies_railway_config_from_repo_root():
    dockerfile = REPO_ROOT / "docker" / "mediamtx" / "Dockerfile"
    config = REPO_ROOT / "docker" / "mediamtx" / "mediamtx.yml"

    assert config.exists()
    assert (
        "COPY docker/mediamtx/mediamtx.yml /mediamtx.yml"
        in dockerfile.read_text()
    )


def test_railway_mediamtx_config_enables_internal_auth():
    config_text = (REPO_ROOT / "docker" / "mediamtx" / "mediamtx.yml").read_text()

    assert 'authMethod: "internal"' in config_text
    assert "authInternalUsers:" in config_text
    assert "- action: api" in config_text
