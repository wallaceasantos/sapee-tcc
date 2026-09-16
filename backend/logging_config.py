"""Configuração de logging estruturado para SAPEE DEWAS."""

import logging
import os
import sys

from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Formatter JSON com campos padronizados para observabilidade."""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record["service"] = "sapee-dewas-api"
        log_record["environment"] = os.getenv("ENVIRONMENT", "development")


def setup_logging() -> None:
    """Configura logging global da aplicação."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    use_json = os.getenv("LOG_FORMAT", "text").lower() == "json"

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Evitar handlers duplicados em reloads (dev)
    if root_logger.handlers:
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    if use_json:
        formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s %(module)s %(funcName)s %(lineno)d",
            rename_fields={"levelname": "level", "asctime": "timestamp"},
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Silenciar logs excessivos de bibliotecas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
