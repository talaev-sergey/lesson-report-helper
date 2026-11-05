from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'source'
OUTPUT = ROOT / 'data' / 'reports.json'
LESSON = re.compile(
    r'^\s*Урок\s+(\d+)(?:\s*\(([^)]*)\))?\s*[:.)—-]\s*(.*?)\s*$',
    re.IGNORECASE,
)


modules = []
for path in sorted(SOURCE.glob('*.md'), key=lambda item: item.stem.casefold()):
    text = path.read_text(encoding='utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')
    lines = text.splitlines()
    events = []
    for index, line in enumerate(lines):
        track = re.match(r'^\s*Линейка\s*:\s*(.*?)\s*$', line, re.IGNORECASE)
        if track:
            events.append((index, 'track', track.group(1)))
        match = LESSON.match(line)
        if match:
            events.append((index, 'lesson', match))

    lessons = []
    current_track = ''
    for event_index, (start, kind, value) in enumerate(events):
        if kind == 'track':
            current_track = value
            continue
        end = events[event_index + 1][0] if event_index + 1 < len(events) else len(lines)
        body = '\n'.join(lines[start + 1:end]).strip()
        body = re.sub(r'\n{3,}', '\n\n', body)
        number, explicit_group, title = value.groups()
        lessons.append({
            'number': int(number),
            'group': explicit_group or current_track,
            'title': title.strip(),
            'body': body,
        })

    modules.append({'name': path.stem, 'lessons': lessons})

OUTPUT.write_text(json.dumps(modules, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(modules)} modules and {sum(len(module["lessons"]) for module in modules)} lessons to {OUTPUT}')
