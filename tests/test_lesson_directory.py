import json
import shutil
import sys
import tempfile
import unittest
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from generate_data import generate
from lesson_directory import generate_lesson_directory, lesson_card, worksheet_card


class Links(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.links = []
        self.feed(page)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.links.append(dict(attrs))


class LessonDirectoryTests(unittest.TestCase):
    def test_staged_directory_links_to_each_generated_classroom_copy(self):
        sheets = json.loads((ROOT / 'data/worksheets.json').read_text(encoding='utf-8'))
        with tempfile.TemporaryDirectory() as build:
            site = Path(build) / 'lesmateriaal'
            generate_lesson_directory(ROOT, site / 'index.html')
            page = (site / 'index.html').read_text(encoding='utf-8')
            self.assertEqual(page.count('<article data-worksheet>'), len(sheets))
            for identifier, sheet in sheets.items():
                pupil_path = f"leerling/{identifier.removeprefix('werkblad-')}/"
                self.assertIn(f'href="./{pupil_path}"', page)
                self.assertIn(f'href="../#{identifier}" hidden', page)
                pupil = (site / pupil_path / 'index.html').read_text(encoding='utf-8')
                for text in [sheet['title'], sheet['goal'], *sheet['tasks']]:
                    self.assertIn(escape(text), pupil)
                for entry in sheet.get('caseFile', []):
                    self.assertIn(escape(entry['label']), pupil)
                    self.assertIn(escape(entry['text']), pupil)
                    self.assertIn('Fictief dossier', pupil)
                self.assertNotIn('Ik vraag de planning na en laat u weten wat ik hoor.', pupil)
                self.assertNotIn('catalog.js', pupil)
                self.assertNotIn('analytics.js', pupil)
                self.assertNotIn('<details', pupil)
                self.assertNotIn('25% stijging', pupil)
                self.assertNotIn('zichtbaar worteltje', pupil)

    def test_own_worksheet_has_a_static_pupil_link_and_an_independent_teacher_link(self):
        sheet = {'title': 'Tellen & vergelijken', 'level': 'Vmbo', 'sectors': ['VO'],
                 'subjects': ['Biologie'], 'goal': 'Eigen metingen vergelijken', 'activity': 'Kiemproef'}
        card = worksheet_card('werkblad-biologiepracticum', sheet)
        self.assertIn('<article data-worksheet>', card)
        self.assertIn('<dd data-directory-sectors="VO">', card)
        self.assertIn('Tellen &amp; vergelijken', card)
        self.assertNotIn('data-directory-minutes', card)
        pupil, teacher = Links(card).links
        self.assertEqual(pupil['href'], './leerling/biologiepracticum/')
        self.assertNotIn('hidden', pupil)
        self.assertEqual(teacher['href'], '../#werkblad-biologiepracticum')
        self.assertEqual(teacher['class'], 'directory-card-link')
        self.assertIn('hidden', teacher)

    def test_generated_and_staged_directory_use_public_available_lessons_only(self):
        original = next(row for row in json.loads((ROOT / 'data/records.json').read_text(encoding='utf-8'))
                        if row.get('lessonStart') and row.get('subjects'))
        public = {**original, 'id': 'les-een', 'title': 'Een les "<met>" & uitleg'}
        public['lessonStart'] = {**public['lessonStart'], 'learningGoal': 'Bron A & B vergelijken',
                                 'activityType': 'Vergelijkend lezen', 'sourceMinutes': 45}
        local_url = 'https://localhost/verborgen'
        records = [
            public,
            {**public, 'id': 'uitsluiting', 'title': 'Uitgesloten les', 'publicationExclusion': {'reason': 'test'}},
            {**public, 'id': 'verouderd', 'title': 'Onbevestigde les', 'verificationStatus': 'stale'},
            {**public, 'id': 'archief', 'title': 'Gearchiveerde les', 'status': 'archived'},
            {**public, 'id': 'geenbron', 'title': 'Onbevestigde leslink',
             'lessonStart': {**public['lessonStart'], 'sourceUrl': 'https://example.org/ander'}},
            {**public, 'id': 'intern', 'title': 'Interne bron',
             'sourceUrls': [{'sourceType': 'official', 'url': local_url}],
             'lessonStart': {**public['lessonStart'], 'sourceUrl': local_url}},
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data').mkdir()
            (root / 'scripts').mkdir()
            shutil.copyfile(ROOT / 'scripts/lesson_directory.html', root / 'scripts/lesson_directory.html')
            for asset in ('platform.css', 'brand.css', 'analytics.js', 'lesgids-filter.js'):
                shutil.copyfile(ROOT / asset, root / asset)
            (root / 'index.html').write_text('<title>Atlas</title>', encoding='utf-8')
            (root / 'data/metadata.json').write_text('{}', encoding='utf-8')
            (root / 'data/records.json').write_text(json.dumps(records), encoding='utf-8')
            generate(root)
            local = (root / 'lesmateriaal/index.html').read_text(encoding='utf-8')
            staged = root / 'publicatie/lesmateriaal/index.html'
            generate_lesson_directory(root, staged)
            self.assertEqual(local, staged.read_text(encoding='utf-8'))
            self.assertEqual(local.count('<article>'), 1)
            self.assertIn(escape(public['title']), local)
            self.assertIn(escape(public['lessonStart']['question']), local)
            self.assertIn(escape(public['lessonStart']['task']), local)
            self.assertIn(f'href="{escape(public["lessonStart"]["sourceUrl"])}" data-atlas-usage="lesson-open"', local)
            self.assertEqual(local.count('data-atlas-usage='), 1)
            marked = [link for link in Links(local).links if 'data-atlas-item-id' in link or 'data-atlas-item-title' in link]
            self.assertEqual(marked, [{'href': public['lessonStart']['sourceUrl'], 'data-atlas-usage': 'lesson-open',
                                       'data-atlas-item-id': public['id'], 'data-atlas-item-title': public['title']}])
            self.assertIn('href="../#item/les-een"', local)
            self.assertIn('href="../#zoeken?type=materials"', local)
            self.assertIn('data-atlas-lesson-directory', local)
            self.assertIn('name="referrer" content="no-referrer"', local)
            self.assertIn('data-filter-sector', local)
            self.assertIn('<option value="HBO">Hoger beroepsonderwijs</option>', local)
            self.assertIn('<option value="WO">Wetenschappelijk onderwijs</option>', local)
            self.assertRegex(local, r'src="\.\./analytics\.js\?v=[a-f0-9]{16}"')
            self.assertRegex(local, r'src="\.\./lesgids-filter\.js\?v=[a-f0-9]{16}"')
            self.assertIn('<dd data-directory-goal>Bron A &amp; B vergelijken</dd>', local)
            self.assertIn('<dd data-directory-activity>Vergelijkend lezen</dd>', local)
            self.assertIn('<data value="45" data-directory-minutes>45 minuten</data>', local)
            self.assertRegex(local, r'<form data-directory-filter [^>]*hidden>')
            for field in ('subject', 'goal', 'activity', 'minutes'):
                self.assertIn(f'data-filter-{field}', local)
            self.assertNotIn('window.ATLAS_RECORDS', local)
            for record in records[1:]:
                self.assertNotIn(record['title'], local)
            self.assertNotIn(local_url, local)
            sectors = ['VO', 'MBO', 'HBO', 'WO']
            public.update(sectors=sectors, lessonStart={**public['lessonStart'], 'sectors': sectors})
            (root / 'data/records.json').write_text(json.dumps([public]), encoding='utf-8')
            generate(root)
            across = (root / 'lesmateriaal/index.html').read_text(encoding='utf-8')
            self.assertEqual(across.count('<article>'), 3)
            for group in ('vo', 'mbo', 'ho'):
                self.assertIn(f'<section aria-labelledby="{group}">', across)
            for sectors_in_group in ('VO', 'MBO', 'HBO WO'):
                self.assertEqual(across.count(f'data-directory-sectors="{sectors_in_group}"'), 1)

    def test_invalid_identifiers_or_titles_keep_the_source_link_without_an_item_marker(self):
        record = next(row for row in json.loads((ROOT / 'data/records.json').read_text(encoding='utf-8')) if row.get('lessonStart'))
        for fields in ({'id': 'x" data-fake="ja'}, {'title': ' '}, {'title': 'Twee\nregels'}):
            with self.subTest(fields=fields):
                primary = Links(lesson_card({**record, **fields})).links[0]
                self.assertEqual(primary, {'href': record['lessonStart']['sourceUrl'], 'data-atlas-usage': 'lesson-open'})

    def test_cards_omit_unknown_durations_and_do_not_infer_goals_or_activities(self):
        record = next(row for row in json.loads((ROOT / 'data/records.json').read_text(encoding='utf-8')) if row.get('lessonStart'))
        lesson = {key: value for key, value in record['lessonStart'].items()
                  if key not in ('sourceMinutes', 'learningGoal', 'activityType')}
        for minutes in (None, True, 0, -1, '45', 12.5):
            with self.subTest(minutes=minutes):
                card = lesson_card({**record, 'lessonStart': {**lesson, 'sourceMinutes': minutes}})
                self.assertNotIn('data-directory-minutes', card)
                self.assertNotIn('data-directory-goal', card)
                self.assertNotIn('data-directory-activity', card)
                self.assertIn(escape(lesson['task']), card)

    def test_sitemap_and_page_use_the_same_canonical_address(self):
        address = 'https://aionderwijsatlas.nl/lesmateriaal/'
        urls = ElementTree.parse(ROOT / 'sitemap.xml').findall('.//{*}loc')
        self.assertEqual([item.text for item in urls].count(address), 1)
        template = (ROOT / 'scripts/lesson_directory.html').read_text(encoding='utf-8')
        self.assertIn(f'rel="canonical" href="{address}"', template)
