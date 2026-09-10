#!/usr/bin/env python3
"""Minimal GIF89a frame-delay reader — verifies per-frame durations survived export."""
import sys, struct

path = sys.argv[1]
data = open(path, 'rb').read()
assert data[:6] in (b'GIF89a', b'GIF87a'), 'not a GIF: %r' % data[:6]
i = 6
w, h, packed, bg, aspect = struct.unpack('<HHBBB', data[i:i+7]); i += 7
if packed & 0x80:
    i += 3 * (2 ** ((packed & 7) + 1))

delays, disposals, transparent_flags = [], [], []
while i < len(data):
    b = data[i]
    if b == 0x3B:  # trailer
        break
    if b == 0x21:  # extension
        label = data[i+1]; i += 2
        if label == 0xF9:  # graphic control extension
            size = data[i]; block = data[i+1:i+1+size]
            packed_gce, delay = struct.unpack('<BH', block[:3])
            disposals.append((packed_gce >> 2) & 7)
            transparent_flags.append(bool(packed_gce & 1))
            delays.append(delay * 10)  # GIF stores hundredths -> ms
            i += 1 + size
        else:
            i += 1
        while data[i] != 0:  # skip sub-blocks
            i += data[i] + 1
        i += 1
    elif b == 0x2C:  # image descriptor
        i += 10
        if data[i-1] & 0x80:
            i += 3 * (2 ** ((data[i-1] & 7) + 1))
        i += 1  # LZW min code size
        while data[i] != 0:
            i += data[i] + 1
        i += 1
    else:
        i += 1

print(f'file: {path}')
print(f'canvas: {w}x{h} | frames: {len(delays)}')
print(f'delays (ms): {delays}')
print(f'total loop: {sum(delays)} ms')
print(f'disposal methods: {sorted(set(disposals))} | transparent frames: {sum(transparent_flags)}/{len(delays)}')
