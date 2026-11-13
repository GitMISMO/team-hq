#!/usr/bin/env python3
"""Build Team HQ's upgrades file from the source in src/.

    python3 build.py <version>          e.g. python3 build.py 20261109b

Writes releases/upgrades-<version>.js. Nothing goes live until that version is
tried in the Test Copy (?try=<version>&check=1) and published with the
Publish a Version workflow. See DEVELOPING.md.
"""
import sys, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')

# The page's modules, in load order. Each runs inside MODS.push(function(){ ... }).
PARTS = ['hqx.js', 'skin.js', 'projects-v2.js', 'hub.js', 'findtime.js', 'plans-v2.js', 'today.js',
         'meeting.js', 'mobile.js', 'syncs.js', 'systems.js', 'next.js', 'oofdates.js', 'expinbox.js', 'mileage.js',
         'tour.js', 'design.js']


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def build(ver):
    """Return the full upgrades file for this version, as text."""
    head = read('frame-head.js')
    guard = read('guard.js').replace('__BUILD__', ver)
    head = head.replace("'use strict';\n",
                        "'use strict';\n/*GUARD>*/\n" + guard + "\n/*<GUARD*/\n/*BOOT>*/\n" + read('bootscreen.js') + "\n/*<BOOT*/\n", 1)
    out = [head.rstrip('\n')]
    for p in PARTS:
        out.append('/* ===== ' + p + ' ===== */')
        out.append('MODS.push(function(){\n' + read(p) + '\n});')
    out.append(read('frame-tail.js'))
    return '\n'.join(out)


if __name__ == '__main__':
    ver = sys.argv[1] if len(sys.argv) > 1 else None
    if not ver or not re.fullmatch(r'[0-9a-z]+', ver):
        sys.exit('usage: python3 build.py <version, letters and numbers only, e.g. 20261109b>')
    text = build(ver)
    os.makedirs(os.path.join(HERE, 'releases'), exist_ok=True)
    path = os.path.join(HERE, 'releases', 'upgrades-' + ver + '.js')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('built', ver, len(text), '->', os.path.relpath(path, HERE))
