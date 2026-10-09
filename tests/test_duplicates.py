import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from publication_scope import duplicate_redirects, duplicate_title_errors


class DuplicateTests(unittest.TestCase):
    def test_titles_are_compared_across_types_with_normalized_provider(self):
        records = [
            {'id': 'one', 'title': 'AI-geletterdheid', 'providerName': 'Universiteit', 'recordType': 'training'},
            {'id': 'two', 'title': 'AI geletterdheid', 'providerName': 'UNIVERSITEIT', 'recordType': 'guidance'},
        ]
        self.assertEqual(len(duplicate_title_errors(records)), 1)
        records[1]['providerName'] = 'Hogeschool'
        self.assertEqual(duplicate_title_errors(records), [])

    def test_distinct_materials_from_same_provider_are_retained(self):
        self.assertEqual(duplicate_title_errors([
            {'id': 'one', 'title': 'Raamwerk', 'providerName': 'SURF'},
            {'id': 'two', 'title': 'Spel bij het raamwerk', 'providerName': 'SURF'},
        ]), [])

    def test_only_reviewed_duplicates_redirect_to_public_records(self):
        kept = {'id': 'kept'}
        old = {'id': 'old', 'publicationExclusion': {'duplicateOf': 'kept'}}
        self.assertEqual(duplicate_redirects([kept, old], [kept]), ({'old': 'kept'}, []))
        for target in ['missing', 'old', None, []]:
            old['publicationExclusion']['duplicateOf'] = target
            redirects, errors = duplicate_redirects([kept, old], [kept])
            self.assertEqual(redirects, {})
            self.assertTrue(errors)

    def test_unrelated_editorial_exclusions_do_not_redirect(self):
        self.assertEqual(duplicate_redirects([
            {'id': 'old', 'publicationExclusion': {'reason': 'Outside scope'}},
        ], []), ({}, []))
