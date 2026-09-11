"""Read ZIP/Office text for the privacy guard without extracting files to disk."""
import io
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

remaining = 64 * 1024 * 1024
entries = 0


def texts(data, depth=0):
    global remaining, entries
    if depth > 3:
        raise ValueError('Archive nesting exceeds the scan limit')
    result = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            entries += 1
            if entries > 10000 or entry.file_size > remaining or entry.flag_bits & 1:
                raise ValueError('Archive cannot be safely scanned')
            remaining -= entry.file_size
            body = archive.read(entry)
            result.extend([entry.filename, body.decode('utf-8', 'replace')])
            if body.startswith(b'PK\x03\x04'):
                result.extend(texts(body, depth + 1))
            elif entry.filename.endswith(('.xml', '.rels')):
                try:
                    root = ET.fromstring(body)
                    result.append(' '.join(root.itertext()))
                    result.extend(value for node in root.iter() for value in node.attrib.values())
                except ET.ParseError:
                    pass  # Raw text above is still scanned.
    return result


try:
    json.dump(texts(sys.stdin.buffer.read()), sys.stdout)
except Exception:
    # Archive filenames and parser errors may themselves contain identifiers.
    sys.stderr.write('Archive privacy inspection failed.\n')
    sys.exit(1)
