"""Regression controls for Cargo's flag precedence and argument boundaries."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('flags', Path(__file__).with_name('native-build-flags.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NativeBuildFlags(unittest.TestCase):
    def flags(self, environment):
        return module.encoded_flags('/workspace/game engine', '/workspace/game engine/cargo',
                                    '/workspace/game engine/target', environment).split('\x1f')

    def test_paths_with_spaces_preserve_argument_boundary(self):
        flags = self.flags({})
        self.assertEqual(len(flags), 3)
        self.assertEqual(flags[0], '--remap-path-prefix=/workspace/game engine=/absolutejs/rapier3d')

    def test_ordinary_flags_follow_cargo_whitespace_rules(self):
        self.assertEqual(self.flags({'RUSTFLAGS': '-C opt-level=3\t--cfg demo'})[:4],
                         ['-C', 'opt-level=3', '--cfg', 'demo'])

    def test_encoded_flags_override_ordinary_flags(self):
        flags = self.flags({'RUSTFLAGS': '--cfg ignored',
                            'CARGO_ENCODED_RUSTFLAGS': '--cfg\x1fvalue="with spaces"'})
        self.assertEqual(flags[:2], ['--cfg', 'value="with spaces"'])
        self.assertNotIn('ignored', flags)

    def test_empty_encoded_flags_still_override(self):
        self.assertEqual(self.flags({'RUSTFLAGS': '--cfg ignored', 'CARGO_ENCODED_RUSTFLAGS': ''}),
                         self.flags({}))

    def test_specific_mappings_override_checkout_mapping(self):
        self.assertEqual([flag.rsplit('=', 1)[1] for flag in self.flags({})],
                         ['/absolutejs/rapier3d', '/absolutejs/cargo', '/absolutejs/target'])


if __name__ == '__main__':
    unittest.main()
