# Sprite row prompt — generate an animation-ready sprite strip

Reconstructed 2026-09 from `sprite-gen` (github.com/aldegad/sprite-gen, Apache-2.0,
`sprite_gen/gen/prepare.py::row_prompt`). Use this to prompt an image model for a sheet
that a parser (or the local animator at `~/apps/sprite-animator`) can actually cut —
**one state per row**, frames left to right, on a chroma key the subject does not contain.

Why it works: a good sprite sheet is specified like a production contract. Four things
typical AI sheet output does — frame numbers, captions/watermarks, drop shadows, a white
background — are explicitly banned here, and those are exactly the things that force
heroic heuristics downstream.

## Inputs to fill

| Variable | Meaning | Petrel default |
|---|---|---|
| `{character_id}` | stable id | `hacker`, `architect`, `merge-conflict` |
| `{character_description}` | one line, identity only | "hooded dev, laptop, ID badge" |
| `{state}` | one animation state per row | `idle`, `walk`, `attack`, `jump`, `wave` |
| `{action}` | what the motion IS | see DEFAULT_STATES below |
| `{frames}` | full-body frames in this row | 4 (idle/attack/jump/wave) |
| `{cell_width}x{cell_height}` | runtime cell size | 256x256 (32px art → 8x upscale) |
| `{safe_margin_x}/{safe_margin_y}` | padding inside cell | 9.4% of the cell (24px @256) |
| `{chroma_name} {chroma_hex}` | flat key colour | magenta `#FF00FF` unless the character is pink/purple |

Attach: (1) the accepted **anchor** image (identity), (2) the **layout guide** PNG (slot
count/spacing only). Reference the base image only for simple/pre-idle runs.

## The prompt

```text
Create a single horizontal sprite strip for the game character `{character_id}` in the state `{state}`.

{REFERENCE_CONTRACT}

Character: {character_description}.
Style contract: {STYLE_CONTRACT}.

Use this prompt as an authoritative sprite-production spec.

Animation action: {action}.

Anchor lock:
- Accepted idle/direction anchors own character identity, outfit details, colors, face design, asymmetric markings, and side-specific accessories for final action rows.
- Base character images and original character sheets are pre-idle sources only. Do not reinterpret or reintroduce base-character details inside a direction-anchor action row.
- This row owns motion only. Spend the variation budget on limb contacts, arm counter-swing, body height, torso lean, head bob, hair bounce, and loop continuity.
- Do not redesign or reinterpret identity details while animating. Keep face, hair shape, markings, palette, outline weight, body proportions, outfit, props, and silhouette copied from the approved anchors.
- Preserve side-specific features exactly as the approved anchors show them. Do not solve hairpin side, earring side, logos, handed props, scars, one-sided markings, asymmetric clothing, or lighting cues from scratch inside the row.
- When generating a paired left/right row, use the paired row reference only for timing, scale, and animation intensity. Rotate the body, feet, shoulders, face angle, and gaze to the target facing, but keep identity details attached according to the accepted target-direction anchor.
- For cyclic locomotion, do not let a single running/walking pose anchor determine every frame's leg phase. When a multi-pose motion reference is attached, use it for foot contacts.
- Prefer a subtler animation over any change that mutates the character identity.

{STATE_REQUIREMENTS}

Transparency and artifact rules:
- Prefer pose, expression, and silhouette changes over decorative effects.
- Effects are allowed only when state-relevant, opaque, hard-edged, sprite-like, fully inside the same frame slot, and physically touching or overlapping the character silhouette.
- Do not draw detached effects: floating stars, loose sparkles, floating punctuation, floating icons, separated smoke clouds, loose dust, disconnected outline bits, or stray pixels.
- Do not draw wave marks, motion arcs, speed lines, action streaks, afterimages, blur, smears, halos, glows, auras, floor patches, cast shadows, contact shadows, drop shadows, oval floor shadows, landing marks, or impact bursts.
- Do not include text, labels, frame numbers, visible grids, guide marks, speech bubbles, thought bubbles, UI panels, code snippets, scenery, checkerboard transparency, white backgrounds, or black backgrounds.
- Reject any pose that is cropped, overlaps another pose, crosses into a neighboring frame slot, or creates a separate disconnected component that is not attached to the character.

Layout requirements:
- Exactly {frames} full-body frames, left to right, in one horizontal row.
- The attached layout guide shows the {frames} frame boxes, inner safe area, and centers for this row. Follow its slot count, spacing, centering, and padding.
- Do not reproduce the layout guide itself: no visible boxes, guide lines, center marks, labels, guide colors, or guide background may appear in the output.
- Treat the image as {frames} equal-width invisible {cell_width}x{cell_height} frame slots. Fill every slot: each requested slot must contain exactly one complete full-body pose.
- Spread the {frames} poses evenly across the whole image width. Do not leave any requested slot blank or create large empty gaps between poses.
- Center one complete pose in each slot. No pose may cross into the neighboring slot.
- Use a perfectly flat pure {chroma_name} {chroma_hex} chroma-key background across the whole image.
- Do not use {chroma_hex}, pure {chroma_name}, or chroma-adjacent colors in the character, highlights, props, shadows, or effects.
- Keep the rendering faithful to the attached reference sprite: same outline weight, same palette, same detail level — do not restyle it.
- Keep every frame self-contained with at least {safe_margin_x} px horizontal and {safe_margin_y} px vertical safe padding. No character body part should be clipped by the frame slot.
- Avoid motion blur. Use clear pose changes readable at {cell_width}x{cell_height}.
- Preserve the same silhouette, face, proportions, palette, material, and props across every frame.

Output only the sprite strip image.
```

## REFERENCE_CONTRACT (block 1)

```text
Use the attached accepted idle/direction anchor as the canonical character design for this row. If a state anchor is attached for a non-locomotion state, treat it as approved state vocabulary only. Use the attached layout guide image only for frame count, slot spacing, centering, and safe padding. If an additional generated row strip is attached, use it only as a motion reference, never as a replacement identity source. Do not simply copy the still reference pose. Generate distinct animation poses that create a readable cycle or action.
```

Prepend this when you are passing a raw base image instead of an accepted anchor:

```text
If this is a pre-idle/simple run, the attached base image may be used as the canonical character design. In direction-anchor mode, do not use base images for final action rows; accepted idle/direction anchors own row identity.
```

## STYLE_CONTRACT — keep it nearly empty

```text
match the attached base/anchor reference image EXACTLY: same pixel density (logical pixel block size), same body proportions, same outline weight, same palette, same shading style, same level of detail. Do not restyle, do not change proportions, do not add or remove detail density.
```

**Do not re-describe your character in the style line.** Upstream's incident log records a
past default ("compact chibi, chunky proportions, thick outline") that kept making slim
bases stubby: text anatomy competes with the reference and drags identity. The attached
image is the style source of truth; text adds only prohibitions.

## STATE_REQUIREMENTS — paste the matching block

`walk` / `run`:
```text
State-specific requirements:
- Show locomotion through body, arm, leg, hair, and prop movement only.
- Use distinct gait poses that create a readable cycle instead of repeated standing or static bobbing.
- Do not draw speed lines, dust clouds, floor shadows, motion trails, or detached motion effects.
```

`idle` (DEFAULT_STATES action text): `subtle breathing and blinking`

`attack` (one-shot): `simple windup, strike, recovery attack pose sequence with no detached effects`

`jump` (one-shot):
```text
State-specific requirements:
- Show the jump through pose and vertical body position only: anticipation, lift, airborne peak, descent, settle.
- Do not draw ground shadows, contact shadows, oval shadows, landing marks, dust, smears, or motion marks under the character.
```

`wave` (one-shot):
```text
State-specific requirements:
- Show the gesture through arm pose only: arm down, arm raised, hand tilted, arm returning.
- Keep the feet planted unless the action explicitly requests stepping.
- Do not draw wave marks, motion arcs, lines, sparkles, symbols, or floating effects around the hand.
```

Directional rows (`running-right`, `running-left`, `running-front-right`, `running-front-left`,
`running-back-right`, `running-back-left`) add, before the state bullets:
```text
- Lock the whole row to a 45-degree {three-quarter-front|three-quarter-back} view facing camera-{left|right} and slightly {toward|away from} the viewer.
- Do not average this into a straight front, straight back, or pure side-view sprite.
- Make camera-{left|right} readable through face/body orientation, hair silhouette, shoulder overlap, hand/foot placement, and prop angle.
```

## The layout guide image

Numbers alone don't hold layout; a picture does. Draw it in Pillow and attach it as a
reference image (`frames * cell_width` x `cell_height`):

- background `#f6f6f6`
- each cell outlined with a 3px `#333333` rectangle
- inner safe area: 2px `#2f80ed` rectangle inset by `safe_margin_x/y`
- a 1px vertical centre line `#b8c8e8` inside each cell

## Chroma key selection (computed, not guessed)

Candidates: magenta `#FF00FF`, green `#00FF00`, cyan `#00FFFF`, blue `#004DFF`.

- Sample the base image with **NEAREST** at 256px — an averaging filter invents colours
exactly on the subject/key boundary, which is the region the test must not see.
- Reject any candidate whose nearest subject pixel is closer than **96** in colour
distance: extraction removes pixels near the key, so a key the character contains would
erase that feature.
- Prefer green for pink/purple/red subjects, magenta for green subjects.
- Never a white or cream background — flood-filling it leaves opaque pockets trapped
between props and legs, and no amount of tolerance cleanup fixes that reliably.

## Codex / GPT-Images wrapper (transparency is a prompt property)

When generating via the `codex` CLI (ChatGPT OAuth), transparency has no tool parameter, so
add to the prompt:

```text
$imagegen 스킬로 built-in image_gen 도구를 정확히 1번 호출해서 다음 프롬프트의 이미지 1장만 생성해줘.
미리보기 전용이라 생성된 파일은 기본 경로에 그대로 두면 된다.
파일 저장·이동·복사·셸 명령·코드 작성·경로 보고 전부 금지. 생성만 하고 끝.
배경은 진짜 투명(알파 채널이 있는 PNG)으로 만들어라 — image_gen 에 transparent background 를 요청하고 생성된 알파를 보존해라.
```

Invoke it as `codex exec --json --sandbox workspace-write --skip-git-repo-check` (no
`--ephemeral`), and read the PNG from the session rollout JSONL — image_gen returns inline
base64, not a file you can trust.

## Pre-flight checklist

- [ ] One state per row; frames left→right; never a grid of mixed states.
- [ ] Anchor image attached; the row prompt claims motion only.
- [ ] Layout guide PNG attached; slot count matches `{frames}`.
- [ ] Chroma key absent from the subject; no key-adjacent colours allowed in art.
- [ ] Numbers, captions, shadows, scenery, checkerboard/white/black background all banned.
- [ ] `Output only the sprite strip image.` is the last line.

## Petrel example (filled)

```text
Create a single horizontal sprite strip for the game character `hacker` in the state `idle`.

Use the attached accepted idle anchor as the canonical character design for this row. Use the attached layout guide image only for frame count, slot spacing, centering, and safe padding. Do not simply copy the still reference pose. Generate distinct animation poses that create a readable cycle or action.

Character: hooded developer with a laptop and ID badge, dev-themed card battler.
Style contract: match the attached base/anchor reference image EXACTLY: same pixel density (logical pixel block size), same body proportions, same outline weight, same palette, same shading style, same level of detail. Do not restyle, do not change proportions, do not add or remove detail density.

Use this prompt as an authoritative sprite-production spec.

Animation action: subtle breathing and blinking.

Anchor lock:
[...the 8 anchor bullets above...]

Transparency and artifact rules:
[...the 6 artifact bullets above...]

Layout requirements:
- Exactly 4 full-body frames, left to right, in one horizontal row.
[...]
- Use a perfectly flat pure magenta #FF00FF chroma-key background across the whole image.
- Do not use #FF00FF, pure magenta, or chroma-adjacent colors in the character, highlights, props, shadows, or effects.
[...]

Output only the sprite strip image.
```

Rows to generate for a playable set: `idle` (4f@4fps loop), `walk` (4f), `attack`
(4f@8fps one-shot), `jump` (4f@8fps one-shot), `wave` (4f@6fps one-shot) — then cut each
row into frames and hand them to an animator/atlas step.
