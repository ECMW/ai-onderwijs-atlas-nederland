"""Keep browser asset versions tied to their contents, across Windows and CI."""
import hashlib
import re

ASSET_REFERENCE = re.compile(
    r'(<(?:script|link)\b[^>]*\b(?:src|href)=")'
    r'([^"?:]+\.(?:js|css))(?:\?[^"<>]*)?("[^>]*>)'
)


def versioned_html(root, html):
    def replace(match):
        path = (root / match[2]).resolve()
        if not path.is_relative_to(root.resolve()):
            raise ValueError("Public asset must stay inside the site")
        # Git checks out CRLF on Windows and LF in CI; they are the same asset.
        content = path.read_text(encoding="utf-8").encode("utf-8")
        version = hashlib.sha256(content).hexdigest()[:16]
        return f'{match[1]}{match[2]}?v={version}{match[3]}'

    return ASSET_REFERENCE.sub(replace, html)
