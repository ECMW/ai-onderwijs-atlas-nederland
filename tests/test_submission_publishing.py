"""Publication policy tests; no GitHub calls or real repository mutations."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("publish_submission", ROOT / "scripts/publish_submission.py")
publication = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publication)


def valid_case():
    repo, baseline, head = "owner/atlas", "a" * 40, "b" * 40
    body = "A complete source-proven form"
    digest = publication.body_hash(body)
    branch = f"codex/inzending-42-{digest[:12]}-{baseline[:12]}"
    run = {"event": "workflow_dispatch", "conclusion": "success", "head_repository": {"full_name": repo},
           "head_branch": branch, "head_sha": head}
    metadata = {"issue": 42, "bodySha": digest, "baseSha": baseline, "headSha": head, "recordId": "new-record"}
    pr = {"number": 71, "user": {"login": publication.BOT}, "draft": False, "state": "open",
          "head": {"ref": branch, "sha": head, "repo": {"full_name": repo}},
          "base": {"ref": "main", "repo": {"full_name": repo}}}
    issue = {"number": 42, "state": "open", "body": body, "labels": [{"name": "atlas-aanvulling"}]}
    validations = {name: {**copy.deepcopy(run), "status": "completed", "workflow_path": f".github/workflows/{name}",
                          "jobs": [{"name": "validate", "conclusion": "success"}]} for name in publication.WORKFLOWS}
    return dict(repo=repo, run=run, pr=pr, metadata=metadata, issue=issue,
                changed=[{"filename": name, "status": "modified"} for name in publication.FILES],
                current_main=baseline, validations=validations, base_records=[{"id": "existing"}],
                candidate_records=[{"id": "existing"}, {"id": "new-record"}])


class SubmissionPublicationTests(unittest.TestCase):
    def test_only_exact_candidate_with_both_genuine_checks_is_publishable(self):
        self.assertEqual(publication.publication_decision(**valid_case())["action"], "merge")

    def test_external_or_non_bot_pull_request_is_rejected(self):
        for path, value in [(('pr', 'user', 'login'), 'someone'), (('pr', 'head', 'repo', 'full_name'), 'other/fork'),
                            (('run', 'event'), 'pull_request'), (('pr', 'head', 'sha'), 'c' * 40)]:
            case = valid_case()
            target = case
            for key in path[:-1]:
                target = target[key]
            target[path[-1]] = value
            self.assertEqual(publication.publication_decision(**case)["action"], "stop")

    def test_closed_relabeled_or_edited_issue_is_rejected(self):
        for key, value in [('state', 'closed'), ('body', 'Edited form'), ('labels', [])]:
            case = valid_case()
            case['issue'][key] = value
            self.assertEqual(publication.publication_decision(**case)["action"], "stop")

    def test_main_change_requires_a_new_immutable_candidate(self):
        case = valid_case()
        case['current_main'] = 'c' * 40
        self.assertEqual(publication.publication_decision(**case)["action"], "reprepare")

    def test_failing_skipped_missing_or_old_commit_validation_never_merges(self):
        for key, value in [('conclusion', 'failure'), ('head_sha', 'd' * 40),
                           ('workflow_path', '.github/workflows/fake.yml'), ('jobs', [{'conclusion': 'skipped'}])]:
            case = valid_case()
            case['validations']['quality-gate.yml'][key] = value
            self.assertEqual(publication.publication_decision(**case)["action"], "stop")
        case = valid_case()
        del case['validations']['quality-gate.yml']
        self.assertEqual(publication.publication_decision(**case)["action"], "wait")

    def test_unexpected_files_existing_record_edits_or_duplicate_records_are_rejected(self):
        for mutation in ['file', 'existing', 'duplicate', 'second_new']:
            case = valid_case()
            if mutation == 'file':
                case['changed'].append({'filename': '.github/workflows/deploy-pages.yml', 'status': 'modified'})
            elif mutation == 'existing':
                case['candidate_records'][0]['title'] = 'changed'
            elif mutation == 'duplicate':
                case['candidate_records'][-1]['id'] = 'existing'
            else:
                case['candidate_records'].append({'id': 'another'})
            self.assertEqual(publication.publication_decision(**case)["action"], "stop")

    def test_provenance_must_match_the_immutable_branch_and_head(self):
        for key, value in [('bodySha', 'c' * 64), ('baseSha', 'c' * 40), ('headSha', 'c' * 40), ('issue', 43)]:
            case = valid_case()
            case['metadata'][key] = value
            self.assertEqual(publication.publication_decision(**case)["action"], "stop")

    def test_marker_roundtrip_and_malformed_marker_fail_closed(self):
        data = valid_case()['metadata']
        self.assertEqual(publication.read_marker(publication.marker(data)), data)
        self.assertEqual(publication.read_marker('<!-- atlas-submission-v1:garbage -->'), {})

    def test_only_verified_legacy_screener_skip_is_allowed(self):
        skipped = {'name': 'screen', 'status': 'completed', 'conclusion': 'skipped',
                   'app': {'slug': 'github-actions'}, 'check_suite': {'id': 123}}
        self.assertTrue(publication.other_checks_pass([skipped], {123}))
        self.assertFalse(publication.other_checks_pass([skipped], {999}))
        self.assertFalse(publication.other_checks_pass([{**skipped, 'name': 'validate'}], {123}))
        self.assertFalse(publication.other_checks_pass([{**skipped, 'conclusion': 'failure'}], {123}))

    def test_last_source_recheck_requires_explicit_readmission_without_mutating_candidate(self):
        case = valid_case()
        case['candidate_records'][-1].update(verificationStatus='recently_checked', lastVerified='2026-09-09')
        original = copy.deepcopy(case['candidate_records'])
        reviewer = Mock(return_value={'eligible': True, 'autoPublishEligible': True})
        self.assertTrue(publication.source_readmission(case['base_records'], case['candidate_records'], reviewer))
        self.assertEqual(case['candidate_records'], original)
        self.assertEqual(reviewer.call_args.args[1][-1]['verificationStatus'], 'needs_review')
        reviewer.return_value = {'eligible': True, 'autoPublishEligible': False}
        self.assertFalse(publication.source_readmission(case['base_records'], case['candidate_records'], reviewer))

    def test_repeated_deployment_callback_does_not_dispatch_again(self):
        case = valid_case()
        api = Mock()
        state = {'bodySha': case['metadata']['bodySha'], 'pr': 71, 'status': 'deployment_requested'}
        api.comments.return_value = [{'user': {'login': publication.BOT}, 'body': publication.marker(state, publication.STATUS_MARKER)}]
        self.assertEqual(publication.request_deployment(api, case['pr'], case['metadata'])['action'], 'already_processed')
        api.dispatch.assert_not_called()
        api.status.assert_not_called()

    def test_weak_admission_without_explicit_automatic_permission_cannot_create_branch(self):
        case = valid_case()
        api = Mock()
        api.issue.return_value = case['issue']
        api.comments.return_value = []
        api.prs.return_value = []
        api.main_sha.return_value = case['current_main']
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data').mkdir()
            (root / 'data/records.json').write_text(json.dumps(case['base_records']), encoding='utf-8')

            def command(arguments, **kwargs):
                if arguments[:2] == ['git', 'rev-parse']:
                    return SimpleNamespace(stdout=case['current_main'], returncode=0)
                report_path = Path(arguments[arguments.index('--report-json') + 1])
                report_path.write_text(json.dumps({'eligible': True, 'addedIds': ['new-record']}), encoding='utf-8')
                return SimpleNamespace(returncode=0)

            with patch.object(publication, 'ROOT', root), patch.object(publication, 'trusted_command', side_effect=command):
                self.assertEqual(publication.prepare(api, 42)['action'], 'needs_info')
        api.request.assert_not_called()
        api.dispatch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
