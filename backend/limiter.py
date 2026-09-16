import ipaddress
import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def _load_trusted_proxies() -> set:
    """Carrega IPs/CIDRs de proxies confiáveis da variável TRUSTED_PROXIES."""
    raw = os.getenv("TRUSTED_PROXIES", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


TRUSTED_PROXIES = _load_trusted_proxies()


def _is_trusted_proxy(ip: str) -> bool:
    """Verifica se um IP pertence à lista de proxies confiáveis."""
    if not ip:
        return False
    if ip in TRUSTED_PROXIES:
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for proxy in TRUSTED_PROXIES:
        if "/" in proxy:
            try:
                if addr in ipaddress.ip_network(proxy, strict=False):
                    return True
            except ValueError:
                continue
    return False


def _get_client_ip(request):
    """
    Identifica o IP do cliente para fins de rate limiting.

    Por padrão usa o IP real da conexão, que não pode ser falsificado pelo
    cliente. Os cabeçalhos X-Forwarded-For / X-Real-IP só são considerados
    quando a conexão imediata vem de um proxy confiável (configurado em
    TRUSTED_PROXIES), evitando que o cliente burle o limite forjando esses
    cabeçalhos.
    """
    peer_ip = get_remote_address(request)

    # Sem proxy confiável na frente: usa o IP da conexão (não falsificável).
    if not _is_trusted_proxy(peer_ip):
        return peer_ip

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Percorre da direita para a esquerda e usa o primeiro IP não confiável.
        chain = [item.strip() for item in forwarded.split(",") if item.strip()]
        for candidate in reversed(chain):
            if not _is_trusted_proxy(candidate):
                return candidate
        if chain:
            return chain[0]

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    return peer_ip


limiter = Limiter(key_func=_get_client_ip)
