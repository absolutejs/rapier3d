"""Cargo-compatible flag encoding with stable source paths for native qualification."""
import os
import sys
from pathlib import Path


def encoded_flags(root, cargo_home, target, environment):
    # Cargo gives the encoded form precedence; ordinary RUSTFLAGS split on whitespace.
    if 'CARGO_ENCODED_RUSTFLAGS' in environment:
        prior = environment['CARGO_ENCODED_RUSTFLAGS']
        flags = prior.split('\x1f') if prior else []
    else:
        flags = environment.get('RUSTFLAGS', '').split()
    # rustc applies the last matching prefix. More specific cache roots follow checkout.
    for source, canonical in [(root, '/absolutejs/rapier3d'),
                              (cargo_home, '/absolutejs/cargo'),
                              (target, '/absolutejs/target')]:
        flags.append(f'--remap-path-prefix={Path(source).resolve()}={canonical}')
    return '\x1f'.join(flags)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit('Expected checkout, Cargo home and target directories')
    print(encoded_flags(*sys.argv[1:], os.environ))
