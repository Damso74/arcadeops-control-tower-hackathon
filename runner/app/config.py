from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runner configuration (pydantic-settings)."""

    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    max_tool_calls: int = Field(default=10, alias="MAX_TOOL_CALLS")
    agent_wall_clock_s: int = Field(default=60, alias="AGENT_WALL_CLOCK_S")
    region: str = Field(default="local", alias="REGION")
    allowed_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="ALLOWED_ORIGINS",
    )
    runner_version: str = Field(default="0.1.0", alias="RUNNER_VERSION")

    # Lot 5 FULL — kill-switch shared-secret authentication.
    # When `runner_require_secret` is True, every request that is not
    # /health must carry an `x-runner-secret` header matching
    # `runner_secret`; otherwise the runner returns 401 (constant-time
    # comparison via hmac.compare_digest in the middleware).
    runner_require_secret: bool = Field(
        default=False, alias="RUNNER_REQUIRE_SECRET"
    )
    runner_secret: str | None = Field(default=None, alias="RUNNER_SECRET")

    # Lot 5 FULL — kill-switch for the /_diag introspection endpoint
    # (returns booleans + lengths, never echoes the secret value). Off
    # by default; flip RUNNER_DIAG_ENABLED=1 in the .env to re-enable.
    runner_diag_enabled: bool = Field(
        default=False, alias="RUNNER_DIAG_ENABLED"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
