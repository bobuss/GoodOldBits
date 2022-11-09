#!/usr/bin/env python

import json
from collections import defaultdict

res = defaultdict(list)


with open('protracker.txt') as f:
    for line in f:
        # 389698	Protracker/1127 Gandalf/grace.mod
        elem = line.strip().split('\t')
        if len(elem) > 1:
            try:
                _, author, song = elem[1].split('/', 2)
                res[author].append(song)
            except Exception as e:
                import pdb; pdb.set_trace()


    with open('protracker.json', 'w') as f:
        f.write(json.dumps(res, sort_keys=True, indent=4, separators=(',', ': ')))

