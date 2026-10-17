"""TwinForge board landmarks, built by script in Blender (5.x, also 4.2+).

Our own low-poly designs per docs/BOARD_ART_REQUESTS.md section 2. Run inside
Blender (GUI or `blender --background --python`); call build(ids, outdir, tier=...).

Tiers: 'lo' (default) is the original low-poly kit (BUDGET); 'hi' is the mid-high
detail pass (BUDGET_HI): block courses, quoins, corbels, tiled roofs, planks,
faceted rocks, foliage clusters and baked-in props, with the same silhouettes,
palette, origin, part names, flag points and mountain summit (z=390). A build
over its tier's budget raises instead of exporting.

Conventions (from the plan):
- 1 Blender unit = 1 board unit. Origin at the centre of the base, base on z=0,
  front faces -Y (exports as +z toward the camera in three.js, +Y up).
- Flat shaded, no subdivision, colour in a FLOAT_COLOR corner attribute "Col"
  (linear). No textures, no baked light.
- Objects: `body`, `roof`, `glow_*` (unlit, keeps vertex colours),
  `flag_<n>` empties where waving flags attach.
- Built in a throwaway scene that is removed afterwards; the user's open
  scene is never touched or saved.
"""
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector, Euler

BUDGET = {"board-keep": 2500, "board-hollow-tree": 2500, "board-beacon": 1800,
          "board-bog-shack": 1800, "board-block-castle": 1500, "board-mountain": 3000}

RED, BLUE, GOLD, GREEN, PURPLE, ORANGE, WHITE, TEAL = 0xe84a3a, 0x2456e0, 0xffc914, 0x3fc46a, 0x8a4ae0, 0xf46036, 0xfaf6ee, 0x1f8a8a
WOOD, WOOD_D, WOOD_L = 0xa8723c, 0x7a5030, 0xc89a5c
STONE, STONE_L, STONE_D, ROCK, ROCK_D = 0xb8b0a8, 0xc8c0b8, 0x948a84, 0x8a7e78, 0x6e6460
LEAF, LEAF_L, LEAF_D = 0x3f9a3a, 0x6cc24a, 0x2c7a34
DARK, GLOW, GLOW_W = 0x2a2440, 0xffd860, 0xfff3b0


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(h, k=1.0):
    return tuple(min(1.0, _lin(((h >> s) & 255) / 255) * k) for s in (16, 8, 0)) + (1.0,)


class Part:
    """One output mesh (body / roof / glow_*) accumulated in a bmesh."""

    def __init__(self, name, rng, fast=False):
        self.name, self.rng, self.fast = name, rng, fast
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("Col")
        self.done = self.bm.faces.layers.int.new("done")  # bevel clears f.tag, so mark faces ourselves

    def add(self, kind, color, pos, size, rot=(0, 0, 0), seg=8, taper=1.0, jitter=0.0, bevel=0.0):
        """kind: box | cyl | cone | frust | ico. pos is the shape's centre."""
        M = Matrix.Translation(pos) @ Euler(rot, 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1))
        bm = self.bm
        if kind == "box":
            r = bmesh.ops.create_cube(bm, size=1.0, matrix=M)
        elif kind == "ico":
            r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.5, matrix=M)
        else:
            r2 = {"cyl": 0.5, "cone": 0.0, "frust": 0.5 * taper}[kind]
            r = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                                      radius1=0.5, radius2=r2, depth=1.0, matrix=M)
        verts = r["verts"]
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(bm, geom=verts + edges, offset=bevel, segments=1, affect='EDGES')
        if self.fast and not bevel:  # hi tier: only this call's faces, in a stable order
            faces = list(dict.fromkeys(f for v in verts for f in v.link_faces))
        else:  # every face this call created or rebuilt is still unmarked
            faces = [f for f in bm.faces if not f[self.done]]
        if jitter:
            vs = dict.fromkeys(v for f in faces for v in f.verts) if self.fast else {v for f in faces for v in f.verts}
            for v in vs:
                v.co.x += self.rng.uniform(-jitter, jitter)
                v.co.y += self.rng.uniform(-jitter, jitter)
                if v.co.z > pos[2]:
                    v.co.z += self.rng.uniform(-jitter, jitter) * 0.5
        for f in faces:
            f[self.done] = 1
            c = rgba(color, 1.0 + self.rng.uniform(-0.05, 0.05))  # faint per-facet variation
            for lp in f.loops:
                lp[self.col] = c
        return faces

    # ---- hi tier helpers (raw faces; each marks its own faces done)
    def paint(self, faces, color, var=0.05):
        cs = color if isinstance(color, (list, tuple)) else None  # one colour, or one per face
        for i, f in enumerate(faces):
            f[self.done] = 1
            c = rgba(cs[i % len(cs)] if cs else color, 1.0 + self.rng.uniform(-var, var))
            for lp in f.loops:
                lp[self.col] = c
        return faces

    def prim(self, kind, color, M, seg=8, r2=0.5, caps=True, var=0.05):
        """box | ico (seg = subdivisions) | cone (r2 = top radius, unit bottom radius 0.5) from a matrix."""
        bm = self.bm
        if kind == "box":
            r = bmesh.ops.create_cube(bm, size=1.0, matrix=M)
        elif kind == "ico":
            r = bmesh.ops.create_icosphere(bm, subdivisions=seg, radius=0.5, matrix=M)
        else:
            r = bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg,
                                      radius1=0.5, radius2=r2, depth=1.0, matrix=M)
        if M.to_3x3().determinant() < 0:  # mirrored frame: keep normals pointing out
            bmesh.ops.reverse_faces(bm, faces=list(dict.fromkeys(f for v in r["verts"] for f in v.link_faces)))
        return self.paint(list(dict.fromkeys(f for v in r["verts"] for f in v.link_faces)), color, var)

    def poly(self, pts, color, out=None, var=0.05):
        f = self.bm.faces.new([self.bm.verts.new(p) for p in pts])
        if out is not None:
            f.normal_update()
            if f.normal.dot(Vector(out)) < 0:
                f.normal_flip()
        return self.paint([f], color, var)[0]

    def mesh(self, pts, faces, color, var=0.05):
        """Faces (index tuples) over shared verts; each normal is turned away from the centroid."""
        vs = [self.bm.verts.new(p) for p in pts]
        c = sum((Vector(p) for p in pts), Vector()) / len(pts)
        out = []
        for idx in faces:
            f = self.bm.faces.new([vs[i] for i in idx])
            f.normal_update()
            if f.normal.dot(f.calc_center_median() - c) < 0:
                f.normal_flip()
            out.append(f)
        return self.paint(out, color, var)

    def hull(self, pts, color, var=0.05):
        """Box topology from 8 corners: 0-3 one end loop, 4-7 the matching loop."""
        return self.mesh(pts, ((0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)), color, var)

    def beam(self, a, b, w, color, d=None, var=0.05):
        a, b = Vector(a), Vector(b)
        q = (b - a).to_track_quat('Z', 'Y')
        M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((w, d or w, (b - a).length, 1))
        return self.prim("box", color, M, var=var)

    def rod(self, a, b, r0, color, r1=None, seg=6, caps=True, var=0.05):
        """Cylinder / frustum / cone (r1=0) from point a to point b."""
        a, b = Vector(a), Vector(b)
        q = (b - a).to_track_quat('Z', 'Y')
        M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((2 * r0, 2 * r0, (b - a).length, 1))
        return self.prim("cone", color, M, seg=seg, r2=0.5 * (r0 if r1 is None else r1) / r0, caps=caps, var=var)

    def to_object(self, coll):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.triangulate(self.bm, faces=[f for f in self.bm.faces if len(f.verts) > 4])
        self.bm.faces.layers.int.remove(self.done)
        self.bm.to_mesh(me)
        self.bm.free()
        for p in me.polygons:
            p.use_smooth = False
        try:
            me.color_attributes.active_color_name = "Col"
            me.color_attributes.render_color_index = me.color_attributes.active_color_index
        except Exception:
            pass
        ob = bpy.data.objects.new(self.name, me)
        coll.objects.link(ob)
        return ob


def flag(coll, n, pos):
    e = bpy.data.objects.new(f"flag_{n}", None)
    e.empty_display_size = 4
    e.location = pos
    coll.objects.link(e)
    return e


# ---------------------------------------------------------------- designs

def keep(P):
    b, r, g = P["body"], P["roof"], P["glow_windows"]
    b.add("frust", ROCK, (0, 0, 15), (200, 130, 30), seg=9, taper=0.78, jitter=4)
    b.add("frust", ROCK_D, (0, 0, 37), (156, 104, 14), seg=9, taper=0.9, jitter=3)
    b.add("cyl", LEAF_L, (0, 0, 45.5), (148, 96, 3), seg=9)
    Z = 47
    b.add("box", STONE_D, (0, 0, Z + 4), (102, 70, 8))
    b.add("box", STONE, (0, 0, Z + 48), (96, 64, 96))
    for k in range(7):
        for y in (-32, 32):
            b.add("box", STONE_D, (-42 + k * 14, y, Z + 101), (8, 4, 10))
    for k in range(4):
        for x in (-48, 48):
            b.add("box", STONE_D, (x, -24 + k * 16, Z + 101), (4, 8, 10))
    b.add("box", DARK, (0, -32.5, Z + 12), (16, 2, 24))
    b.add("cyl", DARK, (0, -32.5, Z + 24), (16, 2, 16), rot=(math.pi / 2, 0, 0))
    b.add("box", WOOD_D, (0, -33.2, Z + 10), (12, 1, 20))
    for x, c in ((-32, RED), (32, BLUE)):
        b.add("box", c, (x, -33, Z + 62), (14, 1, 32))
        b.add("cone", c, (x, -33, Z + 42), (14, 1, 8), rot=(math.pi, 0, 0), seg=4)
        b.add("ico", GOLD, (x, -34, Z + 66), (5, 1.5, 5))
    for x, z in ((-14, 72), (14, 72), (-40, 40), (40, 40)):
        g.add("box", GLOW, (x, -32.6, Z + z), (6, 1, 9))
    for x, y in ((-56, -34), (56, -34), (-56, 34), (56, 34)):
        b.add("cyl", STONE_L, (x, y, Z + 60), (36, 36, 120), seg=10)
        b.add("cyl", STONE_D, (x, y, Z + 116), (42, 42, 8), seg=10)
        r.add("cone", RED, (x, y, Z + 142), (46, 46, 44), seg=10)
        if y < 0:
            g.add("box", GLOW, (x, y - 18.2, Z + 82), (3, 1, 9))
    b.add("cyl", STONE_L, (0, 30, Z + 80), (32, 32, 160), seg=10)
    b.add("cyl", STONE_D, (0, 30, Z + 156), (38, 38, 8), seg=10)
    r.add("cone", BLUE, (0, 30, Z + 184), (42, 42, 48), seg=10)
    g.add("box", GLOW, (0, 13.6, Z + 130), (4, 1, 10))
    poles = [(-56, 34, Z + 164), (56, -34, Z + 164), (0, 30, Z + 208)]
    for x, y, z in poles:
        b.add("cyl", WHITE, (x, y, z + 12), (2.8, 2.8, 24), seg=5)
    for k in range(6):  # steps from the gate down the crag front
        h = Z - k * 8
        b.add("box", STONE_D, (0, -40 - k * 7, h / 2), (22, 8, h))
    for x, y in ((-80, -24), (82, -16), (-72, 36), (76, 34)):
        b.add("ico", LEAF, (x, y, 44), (16, 16, 11))
    return [(x, y, z + 24) for x, y, z in poles]


def beacon(P):
    b, r, g = P["body"], P["roof"], P["glow_lantern"]
    b.add("frust", ROCK, (0, 0, 5), (62, 62, 10), seg=8, taper=0.9, jitter=2)
    for k in range(5):
        d = 52 - k * 4.4
        b.add("cyl", BLUE if k % 2 else GOLD, (0, 0, 23 + k * 26), (d, d, 26), seg=8)
    b.add("cyl", WOOD_D, (0, 0, 142), (56, 56, 4), seg=8)
    for k in range(10):
        a = k / 10 * math.tau
        b.add("cyl", WHITE, (math.cos(a) * 26, math.sin(a) * 26, 150), (2, 2, 12), seg=5)
    for k in range(8):
        a = (k + 0.5) / 8 * math.tau
        b.add("box", WHITE, (math.cos(a) * 26, math.sin(a) * 26, 156), (20.5, 2, 2), rot=(0, 0, a + math.pi / 2))
    g.add("cyl", GLOW_W, (0, 0, 155), (26, 26, 22), seg=8)
    r.add("cone", RED, (0, 0, 178), (38, 38, 24), seg=8)
    b.add("cyl", DARK, (0, 0, 197), (2, 2, 14), seg=5)
    b.add("cone", GOLD, (0, 0, 206), (3, 6, 12), rot=(0, math.pi / 2, 0), seg=4)
    b.add("cone", GOLD, (8, 0, 206), (2, 4, 5), rot=(0, -math.pi / 2, 0), seg=4)
    b.add("box", WOOD_D, (0, -26, 21), (12, 1, 22))
    g.add("box", GLOW, (0, -22.6, 75), (7, 1, 9))
    g.add("box", GLOW, (0, -21.0, 101), (6, 1, 8))
    # keeper's cottage, front-left
    cx, cy = -74, -18
    b.add("box", ROCK, (cx, cy, 2), (48, 38, 4))
    b.add("box", 0xf2e6c8, (cx, cy, 16), (40, 30, 24))
    r.add("cone", TEAL, (cx, cy, 37), (50, 40, 18), rot=(0, 0, math.pi / 4), seg=4)
    b.add("box", WOOD, (cx + 12, cy + 6, 40), (5, 5, 14))
    b.add("box", WOOD_D, (cx - 8, cy - 15.5, 11), (8, 1, 14))
    g.add("box", GLOW, (cx + 9, cy - 15.5, 17), (7, 1, 6))
    return []


def bog_shack(P):
    b, r, g = P["body"], P["roof"], P["glow_lanterns"]
    b.add("frust", 0x4f7a3a, (0, 0, 3), (130, 96, 6), seg=7, taper=0.9, jitter=3)
    for x, y in ((-40, 26), (40, 26), (-40, -26), (40, -26), (0, -30)):
        b.add("cyl", WOOD_D, (x, y, 17), (3.4, 3.4, 28), rot=(0, 0.05 * math.copysign(1, x or 1), 0), seg=5)
    b.add("box", WOOD_L, (0, -6, 31.5), (104, 76, 5))
    b.add("box", 0x6a4a2e, (0, 4, 59), (84, 54, 50), rot=(0, 0.04, 0))
    r.add("cone", 0x5a8a4a, (0, 4, 96), (108, 76, 26), rot=(0, -0.08, math.pi / 4), seg=4)
    b.add("cyl", 0x4a4040, (24, 12, 104), (6, 6, 32), rot=(0.1, 0, 0), seg=6)
    b.add("cone", 0x4a4040, (24, 13.6, 122), (9, 9, 6), seg=6)
    b.add("box", 0x3a2a1e, (-10, -23.5, 47), (16, 1, 26))
    g.add("box", GLOW, (22, -23.5, 64), (14, 1, 12))
    for k in range(7):
        b.add("cyl", WOOD_D, (-48 + k * 16, -42, 39), (2, 2, 10), seg=5)
    b.add("box", WOOD_D, (0, -42, 44), (100, 2, 2))
    for k in range(4):
        h = 34 - k * 8
        b.add("box", WOOD, (38, -48 - k * 7, h / 2), (16, 7, h))
    for x in (-46, 46):
        b.add("box", DARK, (x, -42, 52), (1.2, 1.2, 6))
        g.add("ico", 0x9aff6a, (x, -42, 47), (6, 6, 7))
    for x in (-34, -6):
        b.add("cyl", WOOD_D, (x, -44, 62), (1.6, 1.6, 20), seg=5)
    b.add("box", WHITE, (-20, -44, 70), (28, 0.8, 0.8))
    for k, c in enumerate((RED, GOLD, BLUE)):
        b.add("box", c, (-29 + k * 9, -44, 65), (7, 0.6, 9))
    return []


def hollow_tree(P):
    b, r, g = P["body"], P["roof"], P["glow_lights"]
    TR = 0x6a5040
    b.add("frust", 0x3a2e52, (0, 0, 5), (124, 104, 10), seg=8, taper=0.9, jitter=3)
    b.add("frust", TR, (0, 0, 45), (60, 54, 70), seg=8, taper=0.72, jitter=2)
    for k in range(6):
        a = k / 6 * math.tau + 0.3
        b.add("cone", 0x5a4030, (math.cos(a) * 30, math.sin(a) * 26, 10), (12, 40, 14),
              rot=(math.pi / 2 - 0.35, 0, a - math.pi / 2), seg=5)
    b.add("cyl", DARK, (0, -26.5, 24), (25, 2, 25), rot=(math.pi / 2, 0, 0), seg=10)
    g.add("cyl", 0xffb050, (0, -27.6, 23), (19, 1, 19), rot=(math.pi / 2, 0, 0), seg=10)
    for x in (-11, 11):
        g.add("ico", 0xfff060, (x, -22, 54), (6, 2, 6))
    b.add("cyl", TR, (-26, -4, 84), (6, 6, 34), rot=(0, -0.7, 0), seg=5)
    b.add("cyl", TR, (24, 6, 88), (6, 6, 30), rot=(0, 0.8, 0), seg=5)
    r.add("ico", 0x6a5aa0, (0, 0, 112), (120, 108, 64))
    r.add("ico", 0x3a7a6a, (32, -12, 140), (78, 70, 48))
    r.add("ico", 0x5a4a8a, (-34, 14, 138), (70, 62, 44))
    for k in range(6):
        a = math.pi * (1.15 + k * 0.14)
        x, y = math.cos(a) * 62, math.sin(a) * 52
        b.add("cyl", WOOD_D, (x, y, 11), (2.4, 2.4, 22), seg=5)
        g.add("box", 0xfff060, (x, y, 25), (5, 5, 6))
    for k in range(10):
        a = math.pi * (1.1 + k * 0.088)
        x, y = math.cos(a) * 44, math.sin(a) * 38
        b.add("cyl", WHITE, (x, y, 13), (2.6, 2.6, 6), seg=5)
        g.add("cone", (0x7ad8ff, 0xc08aff, 0xff8ad0)[k % 3], (x, y, 18), (8, 8, 5), seg=6)
    return []


def block_castle(P):
    b, r = P["body"], P["roof"]
    TOY = (RED, BLUE, GOLD, GREEN, PURPLE, ORANGE)
    for i, x in enumerate(range(-60, 61, 20)):  # front wall, gate gap in the middle
        if x == 0:
            continue
        b.add("box", TOY[i % 6], (x, -24, 10), (20, 20, 20), bevel=1.4)
        if i % 2:
            b.add("box", TOY[(i + 2) % 6], (x, -24, 28), (16, 16, 16), bevel=1.2)
    b.add("box", DARK, (0, -22, 10), (20, 4, 20))
    b.add("cyl", GOLD, (0, -24, 26), (36, 20, 20), rot=(math.pi / 2, 0, 0), seg=10)  # ramp-block arch
    for i, x in enumerate(range(-60, 61, 30)):  # back wall
        b.add("box", TOY[(i + 3) % 6], (x, 30, 14), (28, 20, 28), bevel=1.4)
    for i, y in enumerate((-4, 14)):  # side walls
        for x in (-70, 70):
            b.add("box", TOY[(i + (x > 0) * 2) % 6], (x, y, 10), (20, 18, 20), bevel=1.4)
    flags = []
    for x, c, rc in ((-84, BLUE, RED), (84, GREEN, PURPLE)):
        b.add("cyl", c, (x, 4, 32), (28, 28, 64), seg=10)
        r.add("cone", rc, (x, 4, 79), (36, 36, 30), seg=10)
        b.add("cyl", WHITE, (x, 4, 102), (2, 2, 16), seg=5)
        flags.append((x, 4, 110))
    b.add("cyl", PURPLE, (0, 18, 50), (30, 30, 100), seg=10)
    r.add("cone", GOLD, (0, 18, 118), (38, 38, 36), seg=10)
    b.add("cyl", WHITE, (0, 18, 144), (2, 2, 16), seg=5)
    flags.append((0, 18, 152))
    for x, y, c in ((-36, 6, ORANGE), (36, 8, BLUE)):  # loose blocks in the yard
        b.add("box", c, (x, y, 7), (14, 14, 14), rot=(0, 0, 0.4), bevel=1.0)
    return flags


def mountain(P):
    b, g = P["body"], P["glow_crater"]
    MT, MT_D = 0x3a2e40, 0x2c2232
    b.add("frust", MT, (0, 0, 185), (260, 240, 370), seg=9, taper=0.12, jitter=12)
    b.add("frust", MT_D, (-96, 34, 110), (150, 128, 220), seg=7, taper=0.15, jitter=8)
    b.add("frust", MT_D, (104, 42, 90), (132, 116, 180), seg=7, taper=0.16, jitter=8)
    b.add("frust", 0x4a3a50, (-40, -70, 40), (110, 70, 80), seg=7, taper=0.4, jitter=6)
    for k in range(8):
        a = k / 8 * math.tau
        b.add("ico", MT_D, (math.cos(a) * 17, math.sin(a) * 17, 383), (14, 14, 14))
    g.add("cone", 0xff6a2a, (0, 0, 378), (30, 30, 10), rot=(math.pi, 0, 0), seg=9)
    g.add("box", 0xff8a3a, (8, -70, 300), (5, 2, 70), rot=(0.33, 0.1, 0))
    return []


# ================================================================ hi tier
# Same silhouettes, palette, origins, part names and flag points as the lo designs
# above, rebuilt from real detail geometry: block courses, quoins, corbels, tiles,
# planks, rails, faceted rock chunks, foliage clusters and small baked-in props.

BUDGET_HI = {"board-keep": 12000, "board-hollow-tree": 12000, "board-beacon": 8000,
             "board-bog-shack": 8000, "board-block-castle": 6000, "board-mountain": 10000}
UP = Vector((0, 0, 1))
IRON, ROPE, CLAY, MOSS = 0x4a4458, 0xc8a868, 0xc06040, 0x5a9a44
FLOWERS = (RED, GOLD, PURPLE, WHITE, 0xff8ad0, ORANGE)


def Mx(pos, size, rot=(0, 0, 0)):
    return Matrix.Translation(pos) @ Euler(rot, 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1))


def _cyl_pt(cx, cy, r, t, z):
    return Vector((cx + math.cos(t) * r, cy + math.sin(t) * r, z))


def _ang_in(t, a, b):
    return (t - a) % math.tau <= (b - a) % math.tau


class xform:
    """Apply a matrix to every vertex the parts gain inside the with-block (e.g. the shack's lean)."""

    def __init__(self, parts, M):
        self.parts, self.M = parts, M

    def __enter__(self):
        self.start = [len(p.bm.verts) for p in self.parts]

    def __exit__(self, *a):
        for p, s in zip(self.parts, self.start):
            p.bm.verts.ensure_lookup_table()
            for i in range(s, len(p.bm.verts)):
                p.bm.verts[i].co = self.M @ p.bm.verts[i].co


def slab(p, c, u, v, w, h, d, color, back=False, var=0.06):
    """Box centred on c: w along u, h along v, d along u x v (the front). No back face unless asked."""
    c, u, v = Vector(c), Vector(u).normalized(), Vector(v).normalized()
    n = u.cross(v).normalized()
    pts = [c + u * (a * w / 2) + v * (b * h / 2) + n * (s * d / 2)
           for s in (-1, 1) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    faces = [(4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)] + ([(0, 1, 2, 3)] if back else [])
    return p.mesh(pts, faces, color, var)


def wall_u(n):
    return UP.cross(Vector(n)).normalized()


def wall_rows(p, o, n, W, H, cols, ch=7.0, bw=14.0, holes=(), d=1.2, gap=0.7, jit=0.4, sink=0.4):
    """Offset courses of bricks on a flat wall. o = bottom-left corner on the surface as seen
    from outside, n = outward normal, holes = (u0, u1, z0, z1) in wall coordinates."""
    o, n = Vector(o), Vector(n).normalized()
    u = wall_u(n)
    rows = max(1, round(H / ch))
    ch = H / rows
    for i in range(rows):
        z0, z1 = i * ch, (i + 1) * ch
        segs = [(0.0, W)]
        for a, b, hz0, hz1 in holes:
            if hz1 > z0 + 0.5 and hz0 < z1 - 0.5:
                segs = [s for s0, s1 in segs for s in ((s0, min(s1, a)), (max(s0, b), s1)) if s[1] - s[0] > 0.5]
        off = (bw / 2 if i % 2 else 0) + p.rng.uniform(-0.15, 0.15) * bw
        for s0, s1 in segs:
            k = math.floor((s0 + off) / bw)
            while k * bw - off < s1:
                a, b = max(s0, k * bw - off), min(s1, (k + 1) * bw - off)
                if b - a > 1.5:
                    dd = d + p.rng.uniform(-jit, jit)
                    c = o + u * ((a + b) / 2) + n * (dd / 2 - sink) + UP * ((z0 + z1) / 2)
                    slab(p, c, u, UP, b - a - gap, ch - gap, dd, p.rng.choice(cols))
                k += 1


def ring_courses(p, cx, cy, r, z0, H, cols, ch=8.0, nb=12, d=1.1, gap=0.6, skip=(), sides=False, jit=0.35):
    """Offset block courses around a round tower of radius r (front + top face per block)."""
    rows = max(1, round(H / ch))
    ch = H / rows
    for i in range(rows):
        za, zb = z0 + i * ch + gap / 2, z0 + (i + 1) * ch - gap / 2
        a0 = (i % 2) * math.pi / nb + p.rng.uniform(-0.1, 0.1) / nb * math.tau
        for k in range(nb):
            ta = a0 + k / nb * math.tau + gap / (2 * r)
            tb = a0 + (k + 1) / nb * math.tau - gap / (2 * r)
            tm = (ta + tb) / 2
            if any(_ang_in(tm, s0, s1) and z1 > za and zz0 < zb for s0, s1, zz0, z1 in skip):
                continue
            ro, ri = r + d + p.rng.uniform(-jit, jit), r - 0.3
            pts = [_cyl_pt(cx, cy, rr, t, z) for z in (za, zb) for rr, t in ((ri, ta), (ri, tb), (ro, tb), (ro, ta))]
            faces = [(2, 3, 7, 6), (4, 5, 6, 7)] + ([(1, 2, 6, 5), (3, 0, 4, 7)] if sides else [])
            p.mesh(pts, faces, p.rng.choice(cols), 0.06)


def corbels(p, cx, cy, r, z0, h, nb, color, out=3.2, frac=0.5):
    """Machicolation corbels: wedges stepping out under a parapet."""
    for k in range(nb):
        t = (k + 0.5) / nb * math.tau
        w = math.tau * r / nb * frac / 2
        c, u = Vector((math.cos(t), math.sin(t), 0)), Vector((-math.sin(t), math.cos(t), 0))
        base = Vector((cx, cy, 0)) + c * (r - 0.3)
        top = [base + u * s * w + UP * (z0 + h) for s in (-1, 1)]
        bot = [base + u * s * w + UP * z0 for s in (-1, 1)]
        p.hull([top[0], top[1], top[1] + c * out, top[0] + c * out,
                bot[0], bot[1], bot[1] + c * out * 0.3 + UP * h * 0.3, bot[0] + c * out * 0.3 + UP * h * 0.3], color)


def tile_cone(p, cx, cy, z0, R, Hc, cols, rows=6, n=12, lip=1.0, core=None):
    """Conical roof of overlapping, staggered tiles over a slightly smaller core cone."""
    p.prim("cone", core if core is not None else cols[-1], Mx((cx, cy, z0 + Hc / 2), (2 * R * 0.92, 2 * R * 0.92, Hc)), seg=n, r2=0.0)
    for i in range(rows):
        t0, t1 = i / rows, min(0.96, (i + 1.35) / rows)
        a0 = (i % 2) * math.pi / n
        for k in range(n):
            ta, tb = a0 + (k + 0.04) / n * math.tau, a0 + (k + 0.96) / n * math.tau
            r0, r1 = R * (1 - t0), R * (1 - t1)
            zb, zt = z0 + t0 * Hc, z0 + t1 * Hc
            bo = [_cyl_pt(cx, cy, r0 + lip * 0.5, t, zb - lip * 0.6) for t in (ta, tb)]
            bi = [_cyl_pt(cx, cy, r0 * 0.9, t, zb + Hc / R * r0 * 0.1) for t in (ta, tb)]
            tp = [_cyl_pt(cx, cy, r1 + 0.1, t, zt) for t in (ta, tb)]
            col = p.rng.choice(cols)
            tm = (ta + tb) / 2
            out = Vector((math.cos(tm), math.sin(tm), R / Hc))
            p.poly([bo[0], bo[1], tp[1], tp[0]], col, out=out, var=0.07)
            p.poly([bi[0], bi[1], bo[1], bo[0]], col, out=Vector((math.cos(tm), math.sin(tm), -1)), var=0.07)


def tile_pyramid(p, corners, apex, cols, rows=5, tw=6.0, lip=0.9, core=None, cap=None, capw=2.4):
    """Hip roof from base corners + apex: staggered shingle rows on every face, ridge caps on the hips."""
    corners, apex = [Vector(c) for c in corners], Vector(apex)
    ctr = sum(corners, Vector()) / len(corners)
    shrink = lambda q: ctr + (q - ctr) * 0.97
    for i in range(len(corners)):
        p.poly([shrink(corners[i]), shrink(corners[(i + 1) % len(corners)]), apex - UP * 0.4],
               core if core is not None else cols[-1], out=(corners[i] + corners[(i + 1) % len(corners)]) / 2 - ctr)
    p.poly([shrink(c) for c in corners], core if core is not None else cols[-1], out=(0, 0, -1))
    for i in range(len(corners)):
        c0, c1 = corners[i], corners[(i + 1) % len(corners)]
        nrm = (c1 - c0).cross(apex - c0).normalized()
        if nrm.dot((c0 + c1) / 2 - ctr) < 0:
            nrm = -nrm
        for j in range(rows):
            t0, t1 = j / rows, min(0.94, (j + 1.35) / rows)
            L0, R0 = c0.lerp(apex, t0), c1.lerp(apex, t0)
            L1, R1 = c0.lerp(apex, t1), c1.lerp(apex, t1)
            m = max(1, round((R0 - L0).length / tw))
            off = 0.5 / m if j % 2 else 0.0
            cuts = sorted({0.0, 1.0} | {min(1, max(0, (k + off) / m)) for k in range(m + 1)})
            for sa, sb in zip(cuts, cuts[1:]):
                if sb - sa < 0.15 / m:
                    continue
                sa2, sb2 = sa + 0.02 / m, sb - 0.02 / m
                b0, b1 = L0.lerp(R0, sa2), L0.lerp(R0, sb2)
                q0, q1 = L1.lerp(R1, sa2), L1.lerp(R1, sb2)
                bo0, bo1 = b0 + nrm * lip - UP * lip * 0.4, b1 + nrm * lip - UP * lip * 0.4
                col = p.rng.choice(cols)
                p.poly([bo0, bo1, q1 + nrm * 0.15, q0 + nrm * 0.15], col, out=nrm, var=0.07)
                p.poly([b0, b1, bo1, bo0], col, out=nrm - UP, var=0.07)
    for c in corners:  # ridge caps on the hips
        for s in range(3):
            a, b = c.lerp(apex, s / 3), c.lerp(apex, (s + 1) / 3 + 0.02)
            out = (a - ctr)
            out.z = 0
            off = out.normalized() * 0.5 + UP * 0.6
            p.beam(a + off, b + off, capw, cap if cap is not None else cols[0], var=0.05)


def rock(p, pos, size, color, jit=0.16, sub=1, rot=None, zclamp=None):
    rot = rot if rot is not None else (p.rng.uniform(-0.3, 0.3), p.rng.uniform(-0.3, 0.3), p.rng.uniform(0, math.tau))
    faces = p.prim("ico", color, Mx(pos, size, rot), seg=sub, var=0.1)
    m = min(size) * jit
    for v in dict.fromkeys(v for f in faces for v in f.verts):
        v.co += Vector((p.rng.uniform(-m, m), p.rng.uniform(-m, m), p.rng.uniform(-m, m) * 0.6))
        if zclamp is not None:
            v.co.z = min(v.co.z, zclamp)
        v.co.z = max(v.co.z, 0.0)  # base stays on z=0
    return faces


def tuft(p, pos, h, cols=(LEAF, LEAF_L, LEAF_D), blades=3):
    x, y, z = pos
    a0 = p.rng.uniform(0, math.tau)
    for k in range(blades):
        a = a0 + k / blades * math.tau
        lean = h * p.rng.uniform(0.25, 0.45)
        tip = (x + math.cos(a) * lean, y + math.sin(a) * lean, z + h * p.rng.uniform(0.8, 1.1))
        p.rod((x + math.cos(a) * 0.4, y + math.sin(a) * 0.4, z - 0.3), tip, h * 0.16, p.rng.choice(cols), r1=0, seg=3, caps=False)


def flower(p, pos, h, color, stem=LEAF_D):
    x, y, z = pos
    p.rod((x, y, z - 0.3), (x, y, z + h), 0.35, stem, seg=3, caps=False)
    p.prim("cone", color, Mx((x, y, z + h + 0.3), (h * 0.55, h * 0.55, 0.8)), seg=5, r2=0.7)
    p.prim("box", GOLD, Mx((x, y, z + h + 0.8), (h * 0.18, h * 0.18, 0.5)))


def ivy(p, o, n, W, H, leaves, cols=(LEAF, LEAF_D, LEAF_L), vine=LEAF_D):
    """Vines climbing a wall from its foot, leaves laid flat on the surface. o = bottom-left, n = outward."""
    o, n = Vector(o), Vector(n).normalized()
    u = wall_u(n)
    nv = max(1, leaves // 8)
    for s in range(nv):
        x = W * (s + 0.5) / nv
        top = H * p.rng.uniform(0.55, 1.0)
        pts = [o + u * x + n * 0.6]
        for k in range(1, 4):
            pts.append(o + u * (x + p.rng.uniform(-W, W) * 0.18) + UP * (top * k / 3) + n * 0.6)
        for a, b in zip(pts, pts[1:]):
            p.rod(a, b, 0.45, vine, seg=3, caps=False)
        for k in range(leaves // nv):
            t = p.rng.uniform(0, 1)
            seg_i = min(2, int(t * 3))
            q = pts[seg_i].lerp(pts[seg_i + 1], t * 3 - seg_i) + u * p.rng.uniform(-3, 3) + UP * p.rng.uniform(-1.5, 1.5)
            p.rod(q, q + n * 0.9 + UP * 0.2, p.rng.uniform(1.3, 2.0), p.rng.choice(cols), r1=0, seg=4, caps=False)


def window(p, g, c, n, w, h, glow=GLOW, frame=STONE_L, mull=WOOD_D, sill=True, fw=1.6, depth=1.8, shutters=None):
    c, n = Vector(c), Vector(n).normalized()
    u = wall_u(n)
    slab(g, c + n * 0.4, u, UP, w, h, 1.0, glow, back=True, var=0.0)
    for s in (-1, 1):
        slab(p, c + u * s * (w / 2 + fw / 2) + n * (depth / 2 - 0.2), u, UP, fw, h + fw * 2, depth, frame)
    slab(p, c + UP * (h / 2 + fw / 2) + n * (depth / 2), u, UP, w + fw * 2 + 1.2, fw, depth + 0.3, frame)
    if sill:
        slab(p, c - UP * (h / 2 + fw * 0.4) + n * (depth / 2 + 0.6), u, UP, w + fw * 2 + 2, fw * 0.8, depth + 1.4, frame)
    if mull is not None:
        slab(p, c + n * 0.9, u, UP, 0.6, h, 0.5, mull, var=0.0)
        slab(p, c + n * 0.9, u, UP, w, 0.6, 0.5, mull, var=0.0)
    if shutters is not None:
        for s in (-1, 1):
            hc = c + u * s * (w / 2 + fw) + n * (depth - 0.2)
            q = (u * s * math.cos(0.5) + n * math.sin(0.5)).normalized()
            for k in range(2):
                slab(p, hc + q * (w * 0.25 * (2 * k + 1) / 2), q if s > 0 else -q, UP, w * 0.25 - 0.25, h + 1, 0.6, shutters)


def slit(p, c, n, h, frame=STONE_L, dark=DARK, g=None, glow=GLOW):
    c, n = Vector(c), Vector(n).normalized()
    u = wall_u(n)
    if g is not None:
        slab(g, c + n * 0.4, u, UP, 2.4, h, 1.0, glow, back=True, var=0.0)
    else:
        slab(p, c + n * 0.3, u, UP, 1.6, h, 0.8, dark, var=0.0)
        slab(p, c + n * 0.35, u, UP, 4.4, 1.4, 0.8, dark, var=0.0)
    for s in (-1, 1):
        slab(p, c + u * s * 2.2 + n * 0.8, u, UP, 1.6, h + 2.4, 1.6, frame)
    slab(p, c + UP * (h / 2 + 1) + n * 0.9, u, UP, 6.2, 1.6, 1.8, frame)
    slab(p, c - UP * (h / 2 + 0.8) + n * 1.1, u, UP, 6.6, 1.2, 2.4, frame)


def plank_door(p, c, n, w, h, cols=(WOOD_D, 0x6a4428, 0x8a5c38), planks=4, bands=2, iron=IRON, depth=1.0):
    """c = bottom centre on the wall face."""
    c, n = Vector(c), Vector(n).normalized()
    u = wall_u(n)
    pw = w / planks
    for k in range(planks):
        hh = h - p.rng.uniform(0, 0.6)
        slab(p, c + u * (-w / 2 + pw * (k + 0.5)) + UP * hh / 2 + n * depth / 2, u, UP, pw - 0.45, hh, depth, p.rng.choice(cols))
    for j in range(bands):
        z = h * (0.25 + 0.5 * j / max(1, bands - 1))
        slab(p, c + UP * z + n * (depth + 0.2), u, UP, w * 0.86, 1.3, 0.5, iron, var=0.0)
        for s in (-1, 1):
            slab(p, c + UP * z + u * s * w * 0.32 + n * (depth + 0.5), u, UP, 0.8, 0.8, 0.5, 0x8a8494, var=0.0)
    slab(p, c + UP * h * 0.5 + u * w * 0.3 + n * (depth + 0.7), u, UP, 1.2, 1.2, 1.2, GOLD, var=0.0)


def barrel(p, pos, r, h, col=WOOD, hoop=IRON, seg=8):
    x, y, z = pos
    p.prim("cone", col, Mx((x, y, z + h / 4), (2 * r * 0.84, 2 * r * 0.84, h / 2)), seg=seg, r2=0.5 / 0.84, var=0.12)
    p.prim("cone", col, Mx((x, y, z + 3 * h / 4), (2 * r, 2 * r, h / 2)), seg=seg, r2=0.5 * 0.84, var=0.12)
    for zz, rr in ((0.18, 0.92), (0.82, 0.92)):
        p.prim("cone", hoop, Mx((x, y, z + h * zz), (2 * r * rr + 0.5, 2 * r * rr + 0.5, h * 0.09)), seg=seg, caps=False, var=0.0)


def crate(p, pos, s, rot=0.0, col=WOOD_L, trim=WOOD):
    x, y, z = pos
    R = Matrix.Rotation(rot, 3, 'Z')
    ctr = Vector((x, y, z + s / 2))
    p.prim("box", col, Mx(ctr, (s, s, s), (0, 0, rot)), var=0.08)
    for n in (Vector((0, -1, 0)), Vector((1, 0, 0))):
        n = R @ n
        u = wall_u(n)
        f = ctr + n * (s / 2 + 0.3)
        for a in (-1, 1):
            slab(p, f + u * a * (s / 2 - 0.7), u, UP, 1.3, s, 0.6, trim)
            slab(p, f + UP * a * (s / 2 - 0.7), u, UP, s, 1.3, 0.6, trim)
        d = (u + UP).normalized()
        slab(p, f, d, d.cross(n), s * 1.3, 1.2, 0.5, trim)


def lantern(p, g, pos, s, frame=IRON, glow=GLOW, hang=0.0):
    """pos = centre of the light."""
    x, y, z = pos
    slab(g, (x, y, z), (1, 0, 0), (0, 1, 0), s * 0.8, s * 0.8, s * 1.1, glow, back=True, var=0.0)
    for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        p.beam((x + a * s * 0.45, y + b * s * 0.45, z - s * 0.62), (x + a * s * 0.45, y + b * s * 0.45, z + s * 0.62), s * 0.16, frame, var=0.0)
    p.prim("box", frame, Mx((x, y, z - s * 0.66), (s * 1.1, s * 1.1, s * 0.18)), var=0.0)
    p.prim("cone", frame, Mx((x, y, z + s * 0.9), (s * 1.5, s * 1.5, s * 0.5), (0, 0, math.pi / 4)), seg=4, r2=0.0, var=0.0)
    p.prim("box", frame, Mx((x, y, z + s * 1.25), (s * 0.3, s * 0.3, s * 0.3)), var=0.0)
    if hang:
        p.beam((x, y, z + s * 1.3), (x, y, z + s * 1.3 + hang), s * 0.1, frame, var=0.0)


def banner(p, top, n, w, h, col, trim=GOLD, pole=WOOD_D, wall=None):
    """Hanging banner: pole with knobs and brackets, swallow-point cloth, trim band, emblem, tassels."""
    top, n = Vector(top), Vector(n).normalized()
    u = wall_u(n)
    tip = h + w * 0.55
    prof = [(-w / 2, 0), (w / 2, 0), (w / 2, -h), (0, -tip), (-w / 2, -h)]
    pts = [top + u * a + UP * b + n * s * 0.45 for s in (-1, 1) for a, b in prof]
    p.mesh(pts, [(0, 1, 2, 3, 4), (5, 6, 7, 8, 9)] + [(i, (i + 1) % 5, (i + 1) % 5 + 5, i + 5) for i in range(5)], col, 0.05)
    slab(p, top - UP * 2.2 + n * 0.55, u, UP, w + 0.2, 2.0, 1.0, trim)
    slab(p, top - UP * (h - 1.5) + n * 0.55, u, UP, w + 0.2, 1.2, 1.0, trim)
    p.prim("ico", trim, Mx(top - UP * h * 0.45 + n * 0.8, (w * 0.42, 1.2, w * 0.42), (0, 0, math.atan2(u.y, u.x))), seg=1)
    pa, pb = top + UP * 1.2 - u * (w / 2 + 2.5) + n * 0.4, top + UP * 1.2 + u * (w / 2 + 2.5) + n * 0.4
    p.rod(pa, pb, 0.75, pole, seg=5)
    for q in (pa, pb):
        p.prim("ico", trim, Mx(q, (2.2, 2.2, 2.2)), seg=1, var=0.0)
        p.beam(q - UP * 0.5, q - UP * 4.5, 0.35, trim, var=0.0)
        p.rod(q - UP * 4.0, q - UP * 7.0, 0.9, trim, r1=0.2, seg=4)
    p.beam(top - UP * tip, top - UP * (tip + 2.5), 0.35, trim, var=0.0)
    p.rod(top - UP * (tip + 2.2), top - UP * (tip + 5.2), 0.9, trim, r1=0.2, seg=4)
    if wall is not None:
        for q in (pa, pb):
            p.beam(q, q - n * (wall + 0.4), 0.9, IRON, var=0.0)


def weathervane(p, base, s, col=IRON, arrow=GOLD, ang=0.6):
    base = Vector(base)
    p.rod(base, base + UP * s * 1.6, s * 0.06, col, seg=5)
    p.prim("ico", arrow, Mx(base + UP * s * 0.55, (s * 0.3, s * 0.3, s * 0.3)), seg=1, var=0.0)
    zc = base + UP * s * 0.9
    for k in range(4):
        d = Vector((math.cos(k * math.pi / 2), math.sin(k * math.pi / 2), 0))
        p.beam(zc, zc + d * s * 0.55, s * 0.05, col, var=0.0)
        p.prim("box", col, Mx(zc + d * s * 0.62, (s * 0.14, s * 0.14, s * 0.18), (0, 0, k * math.pi / 2)), var=0.0)
    za = base + UP * s * 1.35
    d = Vector((math.cos(ang), math.sin(ang), 0))
    q = Vector((-d.y, d.x, 0))
    p.beam(za - d * s * 0.7, za + d * s * 0.5, s * 0.07, arrow, var=0.0)
    p.rod(za + d * s * 0.45, za + d * s * 0.85, s * 0.16, arrow, r1=0, seg=4)
    p.mesh([za - d * s * 0.5, za - d * s * 0.85 + UP * s * 0.25, za - d * s * 0.85 - UP * s * 0.25,
            za - d * s * 0.5 + q * 0.2, za - d * s * 0.85 + UP * s * 0.25 + q * 0.2, za - d * s * 0.85 - UP * s * 0.25 + q * 0.2],
           [(0, 1, 2), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)], arrow, 0.0)


def rope_coil(p, pos, r, col=ROPE, loops=2):
    x, y, z = pos
    for j in range(loops):
        rr, zz = r * (1 - 0.18 * j), z + 0.7 + j * 1.1
        pts = [(x + math.cos(k / 8 * math.tau) * rr, y + math.sin(k / 8 * math.tau) * rr, zz) for k in range(9)]
        for a, b in zip(pts, pts[1:]):
            p.rod(a, b, 0.7, col, seg=4, caps=False)
    p.rod((x + r, y, z + 0.7), (x + r + 3, y - 2, z + 0.4), 0.6, col, seg=4)


def chain(p, pts, r0, r1, col, seg=5, caps=True):
    n = len(pts) - 1
    for i in range(n):
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        p.rod(pts[i], pts[i + 1], ra, col, r1=rb, seg=seg, caps=caps)


def bush(p, pos, s, cols=(LEAF, LEAF_L, LEAF_D), flowers=2):
    x, y, z = pos
    for k in range(3):
        a = k / 3 * math.tau + p.rng.uniform(0, 1)
        rock(p, (x + math.cos(a) * s * 0.3, y + math.sin(a) * s * 0.3, z + s * 0.32), (s * 0.7, s * 0.7, s * 0.55), p.rng.choice(cols), jit=0.1)
    rock(p, (x, y, z + s * 0.55), (s * 0.6, s * 0.6, s * 0.5), cols[1], jit=0.1)
    for k in range(flowers):
        a = p.rng.uniform(0, math.tau)
        p.prim("ico", p.rng.choice(FLOWERS), Mx((x + math.cos(a) * s * 0.4, y + math.sin(a) * s * 0.4, z + s * 0.7), (2, 2, 2)), seg=1)


def keep_hi(P):
    b, r, g = P["body"], P["roof"], P["glow_windows"]
    rng = b.rng
    SB = (STONE, STONE_L, 0xc0b8b0, 0xaca49c, 0xb4aca4)
    ST = (STONE_L, 0xd2cac2, 0xc4bcb4, 0xbab2aa)
    RK = (ROCK, ROCK_D, 0x9a8e86, 0x7e726c)
    Z = 47
    # crag: the lo masses, wrapped in faceted chunks
    b.add("frust", ROCK_D, (0, 0, 15), (196, 126, 30), seg=12, taper=0.78, jitter=2)
    b.add("frust", ROCK_D, (0, 0, 37), (152, 100, 14), seg=12, taper=0.9, jitter=2)
    b.add("cyl", LEAF_L, (0, 0, 45.5), (148, 96, 3), seg=16)
    for zz, n, kz, sz in ((9, 13, 0.96, 31), (23, 11, 0.85, 27), (37, 10, 0.74, 21)):
        for k in range(n):
            a = (k + rng.uniform(-0.25, 0.25) + (0.5 if zz == 23 else 0)) / n * math.tau
            if zz == 37 and math.sin(a) < -0.9:
                continue  # leave the step run clear
            s = sz * rng.uniform(0.85, 1.2)
            rock(b, (math.cos(a) * 100 * kz, math.sin(a) * 65 * kz, zz), (s * 1.3, s, s * rng.uniform(0.8, 1.0)), rng.choice(RK), zclamp=46)
    for k in range(8):
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 104, math.sin(a) * 69, 2.5), (8, 7, 5), rng.choice(RK), zclamp=None)
    for k in range(6):  # moss on the chunks
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 80, math.sin(a) * 52, 31), (14, 10, 4), MOSS, jit=0.1)
    # plinth
    b.add("box", STONE_D, (0, 0, Z + 4), (100, 68, 8))
    for o, n, W in (((-50, -34, Z), (0, -1, 0), 100), ((-50, 34, Z), (-1, 0, 0), 68), ((50, -34, Z), (1, 0, 0), 68)):
        wall_rows(b, o, n, W, 8, SB, ch=8, bw=12.5, d=1.3)
    # keep body: mortar core + offset courses
    b.add("box", 0x8a827c, (0, 0, Z + 48), (95.4, 63.4, 96))
    holes_f = [(36, 60, -8, 28), (29, 39, 55, 74), (57, 67, 55, 74), (27, 37, 27, 46), (59, 69, 27, 46)]
    wall_rows(b, (-48, -32, Z + 8), (0, -1, 0), 96, 88, SB, ch=8, bw=14, holes=holes_f)
    wall_rows(b, (-48, 18, Z + 8), (-1, 0, 0), 36, 88, SB, ch=8, bw=14)
    wall_rows(b, (48, -18, Z + 8), (1, 0, 0), 36, 88, SB, ch=8, bw=14)
    # string course, corbels, merlons with caps and arrow slits
    b.add("box", STONE_L, (0, 0, Z + 96.8), (99, 67, 1.8))
    for k in range(12):
        x = -41 + k * 7.5
        b.hull([(x - 1.6, -32, Z + 96), (x + 1.6, -32, Z + 96), (x + 1.6, -35, Z + 96), (x - 1.6, -35, Z + 96),
                (x - 1.6, -32, Z + 90), (x + 1.6, -32, Z + 90), (x + 1.6, -33, Z + 92), (x - 1.6, -33, Z + 92)], STONE_L)
    for k in range(7):
        for y in (-32, 32):
            x = -42 + k * 14
            b.add("box", STONE, (x, y, Z + 102), (8, 4, 10))
            b.add("box", STONE_L, (x, y, Z + 107.6), (9.2, 5.2, 1.4))
            if y < 0 and k % 2:
                slab(b, (x, y - 2.1, Z + 102), (1, 0, 0), UP, 1.4, 5, 0.6, DARK, var=0.0)
    for k in range(4):
        for x in (-48, 48):
            b.add("box", STONE, (x, -24 + k * 16, Z + 102), (4, 8, 10))
            b.add("box", STONE_L, (x, -24 + k * 16, Z + 107.6), (5.2, 9.2, 1.4))
    # gate: recess, plank door, raised portcullis, voussoir arch, quoined jambs
    b.add("box", DARK, (0, -32.3, Z + 12), (16, 2, 24))
    b.add("cyl", DARK, (0, -32.3, Z + 24), (16, 2, 16), rot=(math.pi / 2, 0, 0), seg=12)
    plank_door(b, (0, -33.0, Z), (0, -1, 0), 13, 22, planks=4)
    for x in (-6, -3, 0, 3, 6):
        top = Z + 24 + math.sqrt(max(0.0, 64 - x * x)) - 0.6
        b.beam((x, -34.6, Z + 20), (x, -34.6, top), 1.0, IRON, var=0.0)
        b.rod((x, -34.6, Z + 20.2), (x, -34.6, Z + 17.6), 0.8, IRON, r1=0, seg=4)
    for z in (Z + 22, Z + 27):
        hw = math.sqrt(max(0.0, 64 - (z - Z - 24) ** 2)) - 0.4
        b.beam((-hw, -34.6, z), (hw, -34.6, z), 0.9, IRON, var=0.0)
    for k in range(9):
        ta, tb = math.pi * k / 9 + 0.012, math.pi * (k + 1) / 9 - 0.012
        ro = 14.6 if k == 4 else 13.2
        col = STONE_L if k == 4 else (0xd2cac2, STONE)[k % 2]
        pts = [(math.cos(t) * rr, y, Z + 24 + math.sin(t) * rr) for y in (-35.0, -31.8) for rr, t in ((8, ta), (8, tb), (ro, tb), (ro, ta))]
        b.hull(pts, col)
    for s in (-1, 1):
        for j in range(4):
            wdt = 6 if j % 2 == 0 else 4
            x0 = s * (8 + wdt / 2)
            b.add("box", (STONE_L, 0xd2cac2)[j % 2], (x0, -33.6, Z + 8 + 4 * j + 2), (wdt - 0.4, 3.0, 3.6))
    # windows
    for x, z in ((-14, 72), (14, 72), (-16, 44), (16, 44)):
        window(b, g, (x, -32.4, Z + z), (0, -1, 0), 6, 9)
    # banners
    for x, c in ((-31, RED), (31, BLUE)):
        banner(b, (x, -35.4, Z + 79), (0, -1, 0), 14, 33, c, wall=2.4)
    # wall lanterns by the gate, ivy at the left foot
    for x in (-19, 19):
        b.beam((x, -33.4, Z + 22), (x, -37.5, Z + 22), 0.8, IRON, var=0.0)
        lantern(b, g, (x, -38.0, Z + 18.6), 3.2, hang=0.6)
    ivy(b, (-47, -33.2, Z + 8), (0, -1, 0), 14, 34, 22)
    ivy(b, (36, -33.2, Z + 8), (0, -1, 0), 10, 26, 14)
    # corner towers: mortar core, courses, corbels, parapet, tiled roofs
    for x, y in ((-56, -34), (56, -34), (-56, 34), (56, 34)):
        b.add("cyl", 0x948c86, (x, y, Z + 60), (36, 36, 120), seg=12)
        front = y < 0
        skip = []
        if front:
            t = -math.pi / 2
            skip = [(t - 0.2, t + 0.2, Z + 74, Z + 92), (t + (0.75 if x < 0 else -0.75) - 0.18, t + (0.75 if x < 0 else -0.75) + 0.18, Z + 42, Z + 60)]
        ring_courses(b, x, y, 18, Z, 104, ST, ch=10.4 if front else 13, nb=10 if front else 8, skip=skip)
        corbels(b, x, y, 18, Z + 104, 8, 10, STONE_L, out=3.6)
        b.add("cyl", STONE_D, (x, y, Z + 116), (43, 43, 8), seg=14)
        ring_courses(b, x, y, 21.3, Z + 112, 8, ST, ch=8, nb=12, d=0.9)
        tile_cone(r, x, y, Z + 119.5, 23.5, 44.5, (RED, 0xd23c2e, 0xf05a46, 0xe04a36), rows=5, n=12, core=0xb83428)
        if front:
            t = -math.pi / 2
            slit(b, _cyl_pt(x, y, 18.6, t, Z + 83), (math.cos(t), math.sin(t), 0), 9, g=g)
            t2 = t + (0.75 if x < 0 else -0.75)
            slit(b, _cyl_pt(x, y, 18.6, t2, Z + 51), (math.cos(t2), math.sin(t2), 0), 9)
    poles = [(-56, 34, Z + 164), (56, -34, Z + 164), (0, 30, Z + 208)]
    for px, py, pz in poles:
        b.add("cyl", WHITE, (px, py, pz + 12), (2.8, 2.8, 24), seg=6)
        b.add("ico", GOLD, (px, py, pz + 0.5), (4.4, 4.4, 4.4))
        b.add("ico", GOLD, (px, py, pz + 24.8), (3.2, 3.2, 3.2))
    b.add("ico", GOLD, (-56, -34, Z + 164.5), (4.4, 4.4, 4.4))
    b.rod((-56, -34, Z + 165), (-56, -34, Z + 176), 1.4, GOLD, r1=0, seg=5)
    weathervane(b, (56, 34, Z + 163.5), 12)
    # central tower
    b.add("cyl", 0x948c86, (0, 30, Z + 80), (32, 32, 160), seg=12)
    t = -math.pi / 2
    ring_courses(b, 0, 30, 16, Z + 88, 56, ST, ch=8, nb=12, skip=[(t - 0.32, t + 0.32, Z + 122, Z + 140), (t - 0.2, t + 0.2, Z + 98, Z + 112)])
    corbels(b, 0, 30, 16, Z + 144, 8, 12, STONE_L, out=3.4)
    b.add("cyl", STONE_D, (0, 30, Z + 156), (39, 39, 8), seg=14)
    ring_courses(b, 0, 30, 19.3, Z + 152, 8, ST, ch=8, nb=14, d=0.9)
    tile_cone(r, 0, 30, Z + 159.5, 21.5, 48.5, (BLUE, 0x2f62ea, 0x1f4cc8, 0x3a6cf0), rows=7, n=12, core=0x1a3fa8)
    window(b, g, _cyl_pt(0, 30, 16.4, t, Z + 130), (0, -1, 0), 4, 10)
    slit(b, _cyl_pt(0, 30, 16.4, t, Z + 105), (0, -1, 0), 8)
    # steps: stone treads on a rough core, lanterns on posts at the foot
    for k in range(6):
        h = Z - k * 8
        y = -40 - k * 7
        b.add("box", ROCK_D, (0, y, h / 2 - 1), (20, 8, h - 2))
        for j in range(3):
            b.add("box", rng.choice(SB), (-7.3 + j * 7.3 + rng.uniform(-0.3, 0.3), y - 0.3, h - 1.2), (7.0, 8.4, 2.4))
    for x in (-15, 15):
        b.beam((x, -78, 0), (x, -78, 13), 2.2, WOOD_D)
        b.beam((x, -78, 13), (x, -81, 13), 1.0, IRON, var=0.0)
        lantern(b, g, (x, -81, 10.4), 3.0, hang=0.8)
    # props on the green
    barrel(b, (-27, -39, Z), 3.0, 7.5)
    barrel(b, (-21.5, -42, Z), 2.6, 6.5, col=WOOD_L)
    crate(b, (25, -40, Z), 6.5, rot=0.2)
    crate(b, (25.5, -40, Z + 6.5), 4.5, rot=-0.3)
    # greenery
    for x, y in ((-80, -24), (82, -16), (-72, 36), (76, 34)):
        bush(b, (x, y, 39), 16)
    for k in range(18):
        a = rng.uniform(0, math.tau)
        x, y = math.cos(a) * 70, math.sin(a) * 44
        if abs(x) < 16 and y < 0:
            continue
        tuft(b, (x, y, Z), rng.uniform(3, 5))
    for k in range(8):
        a = rng.uniform(0, math.tau)
        x, y = math.cos(a) * rng.uniform(60, 68), math.sin(a) * rng.uniform(38, 43)
        if abs(x) < 16 and y < 0:
            continue
        flower(b, (x, y, Z), 3.5, rng.choice(FLOWERS))
    return [(x, y, z + 24) for x, y, z in poles]


def beacon_hi(P):
    b, r, g = P["body"], P["roof"], P["glow_lantern"]
    rng = b.rng
    RK = (ROCK, ROCK_D, 0x9a8e86)
    BL = (BLUE, 0x2f62ea, 0x1f4cc8, 0x3a6cf0)
    GD = (GOLD, 0xf2b90c, 0xffd23a, 0xfcc020)
    b.add("frust", ROCK_D, (0, 0, 5), (60, 60, 10), seg=12, taper=0.9, jitter=1.5)
    for k in range(12):
        a = (k + rng.uniform(-0.2, 0.2)) / 12 * math.tau
        if abs(a - 1.5 * math.pi) < 0.35:
            continue
        rock(b, (math.cos(a) * 29, math.sin(a) * 29, 5), (13, 10, 9), rng.choice(RK), zclamp=11)
    for k in range(8):
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 34, math.sin(a) * 34, 1.5), (5, 4, 3), rng.choice(RK))
    t = -math.pi / 2
    for k in range(5):
        d = 52 - k * 4.4
        z0, rr = 10 + k * 26, d / 2
        b.add("cyl", 0x1a3a9a if k % 2 else 0xc89a10, (0, 0, z0 + 13), (d - 1.6, d - 1.6, 26), seg=14)
        skip = []
        if k == 0:
            skip = [(t - 0.42, t + 0.42, 10, 40)]
        if k == 2:
            skip = [(t - 0.34, t + 0.34, 67, 84)]
        if k == 3:
            skip = [(t - 0.36, t + 0.36, 94, 109)]
        ring_courses(b, 0, 0, rr - 0.8, z0, 26, BL if k % 2 else GD, ch=6.5, nb=14, d=1.0, skip=skip)
        if k < 4:
            b.add("cyl", WHITE, (0, 0, z0 + 26), (d + 1.6, d + 1.6, 1.8), seg=14)
    # door: arched frame, planks, step, lantern
    c = _cyl_pt(0, 0, 25.4, t, 10)
    b.add("box", DARK, (0, -25.2, 21), (12, 1.6, 22))
    plank_door(b, (0, -25.6, 10), (0, -1, 0), 11, 19, planks=4)
    for k in range(7):
        ta, tb = math.pi * k / 7 + 0.015, math.pi * (k + 1) / 7 - 0.015
        pts = [(math.cos(tt) * rr, y, 29 + math.sin(tt) * rr) for y in (-27.4, -24.8) for rr, tt in ((6, ta), (6, tb), (9, tb), (9, ta))]
        b.hull(pts, WHITE if k != 3 else GOLD)
    for s in (-1, 1):
        for j in range(3):
            b.add("box", (WHITE, STONE_L)[j % 2], (s * (7.5 + (j % 2) * 0.8), -26.0, 11 + 6 * j + 3), (3 + (j % 2) * 1.6, 2.6, 5.6))
    b.add("box", STONE_L, (0, -30.5, 10.6), (16, 6, 1.4))
    b.beam((10.6, -25.6, 28), (10.6, -29.4, 28), 0.7, IRON, var=0.0)
    lantern(b, g, (10.6, -29.8, 25), 2.6, hang=0.6)
    window(b, g, _cyl_pt(0, 0, 21.0, t, 75), (0, -1, 0), 7, 9, frame=WHITE, shutters=0x1f8a8a)
    window(b, g, _cyl_pt(0, 0, 18.9, t, 101), (0, -1, 0), 6, 8, frame=WHITE, shutters=0x1f8a8a)
    # gallery: brackets, planked deck, railing
    for k in range(14):
        tt = (k + 0.5) / 14 * math.tau
        cdir, u = Vector((math.cos(tt), math.sin(tt), 0)), Vector((-math.sin(tt), math.cos(tt), 0))
        w = 1.1
        base = cdir * 16.6
        b.hull([base - u * w + UP * 140, base + u * w + UP * 140, cdir * 26 + u * w + UP * 140, cdir * 26 - u * w + UP * 140,
                base - u * w + UP * 128, base + u * w + UP * 128, cdir * 18 + u * w + UP * 129.5, cdir * 18 - u * w + UP * 129.5], WHITE)
    b.add("cyl", WOOD_D, (0, 0, 142), (56, 56, 4), seg=16)
    for k in range(16):
        ta, tb = (k + 0.04) / 16 * math.tau, (k + 0.96) / 16 * math.tau
        pts = [_cyl_pt(0, 0, rr, tt, z) for z in (143.6, 144.6) for rr, tt in ((4, ta), (4, tb), (27.6, tb), (27.6, ta))]
        b.hull(pts, rng.choice((WOOD, WOOD_L, 0xb88048)))
    for k in range(16):
        ta, tb = k / 16 * math.tau, (k + 1) / 16 * math.tau
        pa, pb = _cyl_pt(0, 0, 26, ta, 0), _cyl_pt(0, 0, 26, tb, 0)
        if k % 2 == 0:
            b.beam(pa + UP * 144, pa + UP * 157.4, 2.0, WHITE)
            b.prim("box", WHITE, Mx(pa + UP * 157.8, (2.8, 2.8, 1.0)))
        else:
            b.rod(pa + UP * 144.5, pa + UP * 156, 0.75, WHITE, seg=4)
        for f in (0.33, 0.67):
            b.rod(pa.lerp(pb, f) + UP * 144.5, pa.lerp(pb, f) + UP * 156, 0.6, WHITE, seg=4)
        b.beam(pa + UP * 156.4, pb + UP * 156.4, 1.6, WHITE, d=1.0)
        b.beam(pa + UP * 150, pb + UP * 150, 0.8, WHITE)
    # lantern room
    g.add("cyl", GLOW_W, (0, 0, 155), (25, 25, 22), seg=16)
    for k in range(8):
        pa = _cyl_pt(0, 0, 12.8, (k + 0.5) / 8 * math.tau, 0)
        b.beam(pa + UP * 145, pa + UP * 165, 1.2, DARK, var=0.0)
    for z in (145, 165):
        b.add("cyl", RED, (0, 0, z), (27.4, 27.4, 2.2), seg=16)
    b.add("cyl", WHITE, (0, 0, 155), (26.2, 26.2, 0.8), seg=16)
    tile_cone(r, 0, 0, 166, 19, 24, (RED, 0xd23c2e, 0xf05a46), rows=4, n=16, core=0xb83428)
    b.add("ico", GOLD, (0, 0, 190.5), (4, 4, 4))
    b.add("cyl", DARK, (0, 0, 197), (2, 2, 14), seg=6)
    for k in range(4):
        dvec = Vector((math.cos(k * math.pi / 2), math.sin(k * math.pi / 2), 0))
        b.beam(Vector((0, 0, 196)), Vector((0, 0, 196)) + dvec * 6, 0.6, DARK, var=0.0)
        b.prim("box", GOLD, Mx(Vector((0, 0, 196)) + dvec * 6.6, (1.4, 1.4, 1.8), (0, 0, k * math.pi / 2)), var=0.0)
    b.add("cone", GOLD, (0, 0, 206), (3, 6, 12), rot=(0, math.pi / 2, 0), seg=6)
    b.add("cone", GOLD, (8, 0, 206), (2, 4, 5), rot=(0, -math.pi / 2, 0), seg=4)
    b.add("ico", DARK, (-3, -1.6, 206.8), (1.0, 1.0, 1.0))
    # keeper's cottage
    cx, cy = -74, -18
    b.add("box", ROCK_D, (cx, cy, 2), (47, 37, 4))
    for k in range(12):
        a = k / 12 * math.tau
        rock(b, (cx + math.cos(a) * 23, cy + math.sin(a) * 18, 2.0), (8, 7, 4.5), rng.choice(RK), zclamp=4.4)
    b.add("box", 0xf2e6c8, (cx, cy, 16), (40, 30, 24))
    PL = (0xb0a8a0, 0x9a908a, 0xc0b8b0)
    wall_rows(b, (cx - 20, cy - 15, 4), (0, -1, 0), 40, 4, PL, ch=4, bw=6.5, holes=[(7, 17, 0, 4)], d=1.0)
    wall_rows(b, (cx - 20, cy + 15, 4), (-1, 0, 0), 30, 4, PL, ch=4, bw=6.5, d=1.0)
    for x, y in ((-20, -15), (20, -15), (-20, 15), (20, 15)):
        b.beam((cx + x, cy + y, 4), (cx + x, cy + y, 28.6), 2.4, WOOD_D)
    for (x0, y0), (x1, y1) in (((-20, -15), (20, -15)), ((-20, -15), (-20, 15)), ((20, -15), (20, 15))):
        b.beam((cx + x0, cy + y0, 27.4), (cx + x1, cy + y1, 27.4), 1.8, WOOD_D)
        b.beam((cx + x0, cy + y0, 8.6), (cx + x1, cy + y1, 8.6), 1.4, WOOD_D)
    b.beam((cx - 20.5, cy - 13, 9), (cx - 20.5, cy - 3, 26.5), 1.4, WOOD_D)
    b.beam((cx - 20.5, cy + 13, 9), (cx - 20.5, cy + 3, 26.5), 1.4, WOOD_D)
    b.beam((cx + 20.5, cy - 13, 9), (cx + 20.5, cy - 3, 26.5), 1.4, WOOD_D)
    plank_door(b, (cx - 8, cy - 15.2, 4), (0, -1, 0), 8, 14, planks=3, cols=(WOOD_D, 0x6a4428, WOOD))
    b.beam((cx - 13, cy - 15.6, 18.6), (cx - 3, cy - 15.6, 18.6), 1.6, WOOD_D)
    b.add("box", STONE_L, (cx - 8, cy - 18.5, 4.6), (11, 5, 1.2))
    window(b, g, (cx + 9, cy - 15.2, 17), (0, -1, 0), 7, 6, frame=WOOD_D, mull=WOOD_D, depth=1.2)
    b.add("box", WOOD, (cx + 9, cy - 17.4, 11.6), (10, 3, 2))
    for k in range(4):
        flower(b, (cx + 5.6 + k * 2.3, cy - 17.4, 12.4), 1.8, FLOWERS[k])
    window(b, g, (cx - 20.2, cy + 3, 17), (-1, 0, 0), 6, 6, frame=WOOD_D, mull=WOOD_D, depth=1.2)
    M = Mx((cx, cy, 37), (50, 40, 18), (0, 0, math.pi / 4))
    corners = [M @ Vector(v) for v in ((0, 0.5, -0.5), (0.5, 0, -0.5), (0, -0.5, -0.5), (-0.5, 0, -0.5))]
    tile_pyramid(r, corners, M @ Vector((0, 0, 0.5)), (TEAL, 0x2a9a9a, 0x187878, 0x239090), rows=5, tw=6.0, core=0x146a6a, cap=0x0f5a5a)
    for k in range(4):
        b.add("box", (ROCK, STONE, ROCK_D)[k % 3], (cx + 12 + rng.uniform(-0.3, 0.3), cy + 6, 34.4 + k * 3.2), (5.6, 5.6, 3.0), rot=(0, 0, rng.uniform(-0.1, 0.1)))
    b.add("box", STONE_L, (cx + 12, cy + 6, 47.2), (7.4, 7.4, 1.2))
    b.add("cyl", CLAY, (cx + 12, cy + 6, 49), (2.8, 2.8, 2.6), seg=6)
    # props and path
    barrel(b, (cx + 26, cy - 22, 0), 3.0, 7.5)
    barrel(b, (cx + 31, cy - 18, 0), 2.6, 6.5, col=WOOD_L)
    crate(b, (cx - 22, cy - 25, 0), 6.5, rot=0.3)
    crate(b, (cx - 15, cy - 26, 0), 5, rot=-0.2)
    rope_coil(b, (-34, -34, 0), 3.4)
    b.beam((cx - 24.5, cy - 6, 0), (cx - 22, cy - 10, 26), 1.2, WOOD_L)
    b.prim("box", WOOD_L, Mx((cx - 24.6, cy - 5.4, 2.8), (1.0, 3.2, 5.6), (0.15, -0.1, 0)))
    for k in range(5):
        x = cx + 2 + k * 8.5
        b.add("box", rng.choice((STONE, STONE_L, ROCK)), (x, -30 + k * 0.3, 0.5), (6.0, 5.0, 1.2), rot=(0, 0, rng.uniform(-0.4, 0.4)))
    for k in range(14):
        a = rng.uniform(0, math.tau)
        tuft(b, (math.cos(a) * 36, math.sin(a) * 36, 0), rng.uniform(3, 4.5))
    for k in range(6):
        a = rng.uniform(0, math.tau)
        flower(b, (cx + math.cos(a) * 26, cy + math.sin(a) * 21, 0), 3.0, rng.choice(FLOWERS))
    return []


def bog_shack_hi(P):
    b, r, g = P["body"], P["roof"], P["glow_lanterns"]
    rng = b.rng
    BW = (0x6a4a2e, 0x7a5634, 0x5c4028, 0x86603a)
    DK = (WOOD_L, 0xb88a50, 0xd4a868, 0xbf9458)
    REED = (0x6a8a3a, 0x7a9a44, 0x5a7a34)
    b.add("frust", 0x4f7a3a, (0, 0, 3), (130, 96, 6), seg=12, taper=0.9, jitter=2)
    for k in range(6):  # mud patches and puddles
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 46, math.sin(a) * 30, 5.6), (20, 14, 1.6), (0x4a5a30, 0x3e6a4a)[k % 2], jit=0.1)
    posts = ((-40, 26), (40, 26), (-40, -26), (40, -26), (0, -30), (0, 26))
    for x, y in posts:
        lean = 0.05 * math.copysign(1, x or 1)
        b.beam((x - lean * 14, y, 3), (x + lean * 14, y, 31), 3.8, rng.choice((WOOD_D, 0x6a4428)))
        b.prim("cone", 0x3e5a2e, Mx((x, y, 4.5), (6, 6, 3)), seg=6, r2=0.35)
    for (x0, y0), (x1, y1) in (((-40, -26), (0, -30)), ((0, -30), (40, -26)), ((-40, -26), (-40, 26)), ((40, -26), (40, 26)), ((-40, 26), (0, 26)), ((0, 26), (40, 26))):
        b.beam((x0, y0 - 1.6 * (y0 < 0), 8), (x1, y1 - 1.6 * (y1 < 0), 27), 1.6, WOOD)
        b.beam((x0, y0 - 1.6 * (y0 < 0), 27), (x1, y1 - 1.6 * (y1 < 0), 8), 1.6, WOOD)
    for x in (-40, 0, 40):
        b.beam((x, -44, 28), (x, 32, 28), 2.2, WOOD_D)
    b.add("box", WOOD_D, (0, -6, 30.5), (100, 72, 2.4))
    for k in range(11):
        y = -43 + k * 6.9
        b.beam((-52 + rng.uniform(-1, 1), y, 33 + rng.uniform(-0.2, 0.2)), (52 + rng.uniform(-1, 1), y, 33 + rng.uniform(-0.2, 0.2)), 6.2, rng.choice(DK), d=2.0)
    b.beam((-52.5, -44.6, 32), (52.5, -44.6, 32), 1.2, WOOD_D, d=3.4)
    # the leaning shack: dark core, crooked vertical boards, battens, corner posts
    lean = Matrix.Translation((0, 4, 59)) @ Matrix.Rotation(0.04, 4, 'Y') @ Matrix.Translation((0, -4, -59))
    with xform([b, g], lean):
        b.add("box", 0x3a2a1e, (0, 4, 59), (82, 52, 50))
        faces = (((-41, -22), (0, -1, 0), 82, [(23, 41, 0, 26.5), (55, 71, 23, 37)]),
                 ((-41, 30), (-1, 0, 0), 52, []), ((41, -22), (1, 0, 0), 52, []), ((41, 30), (0, 1, 0), 82, []))
        for (ox, oy), n, W, holes in faces:
            n = Vector(n)
            u = wall_u(n)
            o = Vector((ox, oy, 34))
            nb = round(W / 6.8)
            pw = W / nb
            for k in range(nb):
                a, bb = k * pw, (k + 1) * pw
                spans = [(0.0, 50.0)]
                for h0, h1, z0, z1 in holes:
                    if bb > h0 and a < h1:
                        spans = [s for s0, s1 in spans for s in ((s0, min(s1, z0)), (max(s0, z1), s1)) if s[1] - s[0] > 1.5]
                for z0, z1 in spans:
                    top = z1 - (rng.uniform(0, 2.5) if z1 >= 50 else 0)
                    c = o + u * ((a + bb) / 2) + UP * ((z0 + top) / 2) + n * 0.6
                    tilt = rng.uniform(-0.035, 0.035)
                    uu = u * math.cos(tilt) + UP * math.sin(tilt)
                    vv = UP * math.cos(tilt) - u * math.sin(tilt)
                    slab(b, c, uu, vv, pw - 0.7, top - z0, 1.4, rng.choice(BW))
                    if n.y < 0 or n.x < 0:  # nails where the boards meet the battens, on the faces we see
                        for zn in (37, 81):
                            if z0 < zn - 34 < top:
                                b.prim("box", IRON, Mx(o + u * ((a + bb) / 2) + UP * (zn - 34) + n * 2.4, (0.7, 0.7, 0.7)), var=0.0)
            for z in (37, 81):
                slab(b, o + u * W / 2 + UP * (z - 34) + n * 1.6, u, UP, W, 2.4, 1.2, WOOD_D)
        for x, y in ((-41, -22), (41, -22), (-41, 30), (41, 30)):
            b.beam((x, y, 34), (x, y, 84), 3.4, WOOD_D)
        # patch boards and nails
        slab(b, (-28, -23.6, 70), (math.cos(0.5), 0, math.sin(0.5)), (-math.sin(0.5), 0, math.cos(0.5)), 14, 3, 0.8, 0x9a7a4a)
        slab(b, (-27, -23.7, 64), (math.cos(-0.3), 0, math.sin(-0.3)), (math.sin(0.3), 0, math.cos(0.3)), 12, 3, 0.8, 0x8a6a40)
        for x, z in ((-33, 67), (-23, 73), (-32, 65.5), (-22, 62.6)):
            b.prim("box", IRON, Mx((x, -24.2, z), (0.8, 0.6, 0.8)), var=0.0)
        # door: frame, planks, Z brace, hinges
        b.add("box", 0x2a1e16, (-10, -22.6, 47), (16, 1, 26))
        plank_door(b, (-10, -23.0, 34), (0, -1, 0), 15, 25, planks=4, cols=(0x3a2a1e, 0x4a3424, 0x52382a), bands=2)
        slab(b, (-10, -24.6, 46.5), ((math.cos(0.9), 0, math.sin(0.9))), ((-math.sin(0.9), 0, math.cos(0.9))), 17, 1.6, 0.6, 0x5a4030)
        for s in (-1, 1):
            b.beam((-10 + s * 8.6, -24, 34), (-10 + s * 8.6, -24, 61), 1.6, WOOD_D)
        b.beam((-19, -24, 61), (-1, -24, 61), 1.8, WOOD_D)
        window(b, g, (22, -22.4, 64), (0, -1, 0), 14, 12, frame=WOOD_D, mull=WOOD_D, fw=1.4, depth=1.4)
        for k in range(3):  # one shutter hanging crooked
            slab(b, (12.4 + k * 0.4, -25.4, 62 - k * 3.6), (math.cos(0.12), 0, math.sin(0.12)), (-math.sin(0.12), 0, math.cos(0.12)), 4.6, 3.3, 0.6, rng.choice(BW))
        b.add("box", WOOD, (22, -25.5, 56.6), (16, 3.2, 2.2))
        for k in range(5):
            flower(b, (16 + k * 3, -25.5, 57.6), 2.0, rng.choice(FLOWERS))
    # mossy shingle hip roof
    M = Mx((0, 4, 96), (108, 76, 26), (0, -0.08, math.pi / 4))
    corners = [M @ Vector(v) for v in ((0, 0.5, -0.5), (0.5, 0, -0.5), (0, -0.5, -0.5), (-0.5, 0, -0.5))]
    apex = M @ Vector((0, 0, 0.5))
    tile_pyramid(r, corners, apex, (0x5a8a4a, 0x6c9a50, 0x4a7a3e, 0x62904c, 0x557a40), rows=6, tw=7.0, core=0x3e6a34, cap=WOOD_D, capw=3.0)
    for k in range(6):
        f = rng.uniform(0.2, 0.6)
        c0, c1 = corners[k % 4], corners[(k + 1) % 4]
        q = c0.lerp(c1, rng.uniform(0.3, 0.7)).lerp(apex, f)
        rock(r, q + UP * 1.2, (9, 9, 3), MOSS, jit=0.12)
    # stove pipe with bands and a hat
    pa, pb = Vector((24, 10.4, 88)), Vector((24, 13.6, 120))
    chain(b, [pa, pa.lerp(pb, 0.5), pb], 3.0, 3.0, 0x4a4040, seg=8)
    for f in (0.3, 0.62, 0.94):
        q = pa.lerp(pb, f)
        b.rod(q - UP * 0.7, q + UP * 0.7, 3.6, 0x6a6060, seg=8, caps=False)
    b.add("cone", 0x4a4040, (24, 13.6, 123), (11, 11, 5), seg=8)
    for s in (-1, 1):
        b.beam((24 + s * 3.5, 13.6, 120), (24 + s * 4.6, 13.6, 121), 0.6, 0x4a4040, var=0.0)
    # porch railing with balusters
    for k in range(7):
        x = -48 + k * 16
        b.beam((x, -42, 34), (x, -42, 45.6), 2.0, WOOD_D)
        if k < 6:
            for j in range(1, 4):
                xx = x + j * 4
                b.beam((xx, -42, 34.5), (xx + rng.uniform(-0.3, 0.3), -42, 44), 0.9, rng.choice((WOOD, WOOD_D)))
    b.beam((-49.5, -42, 44.8), (49.5, -42, 44.8), 1.6, WOOD_D, d=2.4)
    b.beam((-48, -42, 37), (48, -42, 37), 1.0, WOOD_D)
    # steps: stringers, treads, handrail
    for x in (30.6, 45.4):
        b.beam((x, -44, 34), (x, -73, 0), 1.8, WOOD_D, d=3.2)
    for k in range(5):
        z = 34 - k * 7.4 - 2
        y = -46 - k * 6.2
        b.beam((30, y, z), (46, y, z), 6.6, rng.choice(DK), d=1.6)
    b.beam((46.8, -42, 45), (46.8, -72, 10), 1.0, WOOD_D)
    b.beam((46.8, -72, 0), (46.8, -72, 10.5), 1.6, WOOD_D)
    # lanterns hung on bracket arms
    for x in (-46, 46):
        b.beam((x, -42, 45.6), (x, -42, 56), 1.4, DARK)
        b.beam((x, -42, 56), (x, -45.5, 56), 0.8, DARK, var=0.0)
        lantern(b, g, (x, -45.5, 50.2), 3.6, frame=DARK, glow=0x9aff6a, hang=1.2)
    # wash line: crooked poles, line, clothes with pegs
    for x in (-34, -6):
        b.beam((x, -44, 45), (x + rng.uniform(-0.8, 0.8), -44, 72), 1.6, WOOD_D)
    b.beam((-34, -44, 70), (-6, -44, 70), 0.5, WHITE, var=0.0)
    for k, c in enumerate((RED, GOLD, BLUE)):
        x = -29 + k * 9
        slab(b, (x, -44, 65.5), (1, 0, 0), UP, 6, 8, 0.6, c, back=True)
        if k != 1:
            for s in (-1, 1):
                slab(b, (x + s * 3.8, -44, 67.6), (math.cos(s * 0.5), 0, math.sin(s * 0.5)), (-math.sin(s * 0.5), 0, math.cos(s * 0.5)), 2.4, 3.0, 0.6, c, back=True)
        for s in (-1, 1):
            b.prim("box", WOOD_L, Mx((x + s * 2.2, -44, 70.2), (0.7, 0.9, 2.0)), var=0.0)
    # props
    barrel(b, (-38, -32, 34), 3.4, 8.5)
    barrel(b, (-31.5, -35, 34), 3.0, 7.5, col=WOOD_L)
    crate(b, (-24, -36.5, 34), 6.0, rot=0.15)
    rope_coil(b, (12, -36, 34), 3.6)
    b.beam((48, -26, 34), (50, -10, 62), 0.6, WOOD_D, var=0.0)
    b.prim("cone", IRON, Mx((10, -10, 4.4), (5, 5, 6)), seg=6, r2=0.6)
    # marsh: reeds, cattails, lily pads, toadstools, stones
    for k in range(16):
        a = rng.uniform(0, math.tau)
        x, y = math.cos(a) * rng.uniform(52, 62), math.sin(a) * rng.uniform(36, 44)
        h = rng.uniform(10, 18)
        top = (x + rng.uniform(-1.5, 1.5), y + rng.uniform(-1.5, 1.5), 5 + h)
        b.rod((x, y, 5), top, 0.5, rng.choice(REED), seg=3, caps=False)
        if k % 2 == 0:
            b.rod(Vector(top) - UP * 4, Vector(top) - UP * 0.5, 0.95, 0x6a4428, seg=5)
    for k in range(18):
        a = rng.uniform(0, math.tau)
        tuft(b, (math.cos(a) * rng.uniform(40, 60), math.sin(a) * rng.uniform(28, 42), 6), rng.uniform(3, 5), cols=REED)
    for x, y in ((-50, -36), (-58, -18), (54, 22), (-20, 40)):
        b.prim("cone", 0x2f8a5a, Mx((x, y, 6.2), (9, 9, 0.6)), seg=7, r2=0.5)
        b.prim("ico", 0xff8ad0, Mx((x + 1.4, y, 7.2), (2.4, 2.4, 1.8)), seg=1)
    for x, y in ((-56, 8), (58, -10), (-12, -40)):
        b.rod((x, y, 5.6), (x, y, 9), 0.9, WHITE, seg=5)
        b.prim("cone", RED, Mx((x, y, 10), (6, 6, 3)), seg=8, r2=0.1)
        for k in range(3):
            a = k / 3 * math.tau
            b.prim("box", WHITE, Mx((x + math.cos(a) * 1.6, y + math.sin(a) * 1.6, 10.6), (0.8, 0.8, 0.6)), var=0.0)
    for k in range(8):
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 58, math.sin(a) * 42, 5), (6, 5, 4), rng.choice((ROCK, ROCK_D)))
    return []


def hollow_tree_hi(P):
    b, r, g = P["body"], P["roof"], P["glow_lights"]
    rng = b.rng
    TR, TRS = 0x6a5040, (0x6a5040, 0x5a4434, 0x7a5c48, 0x624838)
    GR = (0x3e5a4a, 0x4a6a52, 0x34503e)
    b.add("frust", 0x3a2e52, (0, 0, 5), (124, 104, 10), seg=14, taper=0.9, jitter=2)
    b.add("frust", TR, (0, 0, 45), (58, 52, 70), seg=12, taper=0.72, jitter=1.5)
    # bark ridges
    for k in range(16):
        a = k / 16 * math.tau
        if abs(((a + math.pi / 2 + math.pi) % math.tau) - math.pi) < 0.5:
            continue  # leave the doorway face clear
        tw = rng.uniform(-0.12, 0.12)
        pts = [(math.cos(a + tw * j) * 29.5 * (1 - 0.28 * j / 2), math.sin(a + tw * j) * 26.5 * (1 - 0.28 * j / 2), 10 + 35 * j) for j in range(3)]
        chain(b, pts, rng.uniform(2.2, 3.0), 1.4, rng.choice(TRS), seg=4)
    for x, z in ((-20, 60), (18, 34), (24, 66)):
        rock(b, (x, -18, z), (5, 3, 6), 0x4a3a2c, jit=0.1)
    # roots with smaller root branches
    for k in range(8):
        a = k / 8 * math.tau + 0.3
        if abs(((a + math.pi / 2 + math.pi) % math.tau) - math.pi) < 0.35:
            a += 0.4
        d = Vector((math.cos(a), math.sin(a) * 0.9, 0))
        pts = [d * 22 + UP * 22, d * 32 + UP * 12, d * 42 + UP * 6, d * 52 + UP * 9.5]
        chain(b, pts, 5.5, 1.4, rng.choice(TRS), seg=6)
        for j, s in ((1, 1), (2, -1)):
            side = Vector((-d.y, d.x, 0)) * s
            q = pts[j]
            chain(b, [q, q + d * 6 + side * 6 + UP * -3, q + d * 9 + side * 11 + UP * -3.5], 2.4, 0.7, rng.choice(TRS), seg=5)
    # round door: dark well, glow, wedge frame, half-open plank door, step, mat
    b.add("cyl", DARK, (0, -26.5, 24), (25, 2, 25), rot=(math.pi / 2, 0, 0), seg=14)
    g.add("cyl", 0xffb050, (0, -27.6, 23), (19, 1, 19), rot=(math.pi / 2, 0, 0), seg=14)
    for k in range(12):
        ta, tb = k / 12 * math.tau + 0.02, (k + 1) / 12 * math.tau - 0.02
        if math.sin((ta + tb) / 2) < -0.85:
            continue
        pts = [(math.cos(t) * rr, y, 24 + math.sin(t) * rr) for y in (-29.0, -26.2) for rr, t in ((12.4, ta), (12.4, tb), (15.6, tb), (15.6, ta))]
        b.hull(pts, (WOOD_L, 0xb88a50)[k % 2])
    hinge = Vector((-9.4, -28.6, 12))
    q = Vector((-math.cos(1.0), -math.sin(1.0), 0))
    for k in range(4):
        x = (k + 0.5) * 4.2
        hh = 2 * math.sqrt(max(0.0, 81 - (x - 9) ** 2)) * 0.9 + 4
        slab(b, hinge + q * -x + UP * hh / 2, q, UP, 3.8, hh, 1.0, rng.choice((WOOD, WOOD_D, 0x8a5c38)))
    b.add("cyl", STONE_L, (0, -34, 1.6 + 10), (20, 9, 1.4), seg=8)
    b.add("box", 0x8a4ae0, (0, -33, 12.6), (12, 6, 0.4))
    # windows: round frames, glow, mullions, flower boxes
    for x in (-11, 11):
        g.add("ico", 0xfff060, (x, -22, 54), (6, 2, 6))
        for k in range(8):
            ta, tb = k / 8 * math.tau + 0.03, (k + 1) / 8 * math.tau - 0.03
            pts = [(x + math.cos(t) * rr, y, 54 + math.sin(t) * rr) for y in (-24.4, -21.6) for rr, t in ((3.3, ta), (3.3, tb), (5.0, tb), (5.0, ta))]
            b.hull(pts, WOOD_L)
        b.beam((x, -23.6, 50.8), (x, -23.6, 57.2), 0.5, WOOD_D, var=0.0)
        b.beam((x - 3.2, -23.6, 54), (x + 3.2, -23.6, 54), 0.5, WOOD_D, var=0.0)
        b.add("box", WOOD, (x, -24.6, 48.4), (9, 3, 2))
        for k in range(3):
            flower(b, (x - 2.6 + k * 2.6, -24.6, 49.2), 1.8, FLOWERS[(k + (x > 0) * 2) % 6])
    # branches with twigs
    for pts in (((-20, -4, 76), (-34, -4, 90), (-44, 2, 104)), ((20, 6, 76), (32, 6, 90), (44, -2, 106)), ((4, 14, 78), (8, 24, 96), (6, 30, 110))):
        chain(b, [Vector(p_) for p_ in pts], 5.0, 2.0, TR, seg=6)
        a_ = Vector(pts[1])
        chain(b, [a_, a_ + Vector((rng.uniform(-8, 8), -6, 10))], 1.6, 0.5, TR, seg=4)
    # rope swing under the left branch, moss and shelf mushrooms on the trunk
    for y in (-8, 4):
        b.beam((-36, y, 91), (-36, y, 66), 0.5, ROPE, var=0.0)
    b.prim("box", WOOD_L, Mx((-36, -2, 65.5), (6, 16, 1.4)))
    for k in range(9):
        a = rng.uniform(0, math.tau)
        if abs(((a + math.pi / 2 + math.pi) % math.tau) - math.pi) < 0.5:
            a += 1.0
        z = rng.uniform(14, 70)
        k_ = 1 - 0.28 * (z - 10) / 70
        rock(b, (math.cos(a) * 29 * k_, math.sin(a) * 26 * k_, z), (9, 9, 5), rng.choice((MOSS, 0x4a8a3c, 0x6aaa4a)), jit=0.12)
    for z, a in ((40, 0.2), (46, 0.0), (60, 3.0), (34, 2.6)):
        k_ = 1 - 0.28 * (z - 10) / 70
        b.prim("cone", (0xffd0a0, 0xffb080)[int(z) % 2], Mx((math.cos(a) * 30 * k_, math.sin(a) * 27 * k_, z), (8, 8, 1.6)), seg=7, r2=0.35)
    # canopy: three lobes of leaf clusters, droopy leaf tips, a few fireflies
    CAN = ((0, 0, 112, 60, 54, 32, (0x6a5aa0, 0x5a4a8a, 0x7a6ab4, 0x62529a)),
           (32, -12, 140, 39, 35, 24, (0x3a7a6a, 0x2f6a5c, 0x468a78, 0x3a8070)),
           (-34, 14, 138, 35, 31, 22, (0x5a4a8a, 0x4e3e7a, 0x6a5aa0, 0x56468a)))
    for cx, cy, cz, rx, ry, rz, cols in CAN:
        rock(r, (cx, cy, cz), (rx * 1.8, ry * 1.8, rz * 1.8), cols[1], sub=2, jit=0.06)
        nc = int(rx * 1.1)
        for k in range(nc):
            phi = math.acos(1 - 2 * (k + 0.5) / nc)
            th = k * 2.39996
            dvec = Vector((math.sin(phi) * math.cos(th), math.sin(phi) * math.sin(th), math.cos(phi)))
            if dvec.z < -0.55:
                continue
            s = rng.uniform(0.32, 0.46) * rx
            pos = Vector((cx + dvec.x * rx * 0.9, cy + dvec.y * ry * 0.9, cz + dvec.z * rz * 0.9))
            rock(r, pos, (s, s, s * 0.8), rng.choice(cols), jit=0.14)
        for k in range(int(rx * 0.3)):
            a = rng.uniform(0, math.tau)
            pos = Vector((cx + math.cos(a) * rx * 0.8, cy + math.sin(a) * ry * 0.8, cz - rz * 0.55))
            r.rod(pos + UP * 2, pos - UP * rng.uniform(5, 9), rng.uniform(2.2, 3.2), rng.choice(cols), r1=0, seg=4)
    for k in range(10):
        a = rng.uniform(0, math.tau)
        g.add("ico", rng.choice((0xfff060, 0xb0ff80, 0xffd0f0)), (math.cos(a) * 62, math.sin(a) * 52, rng.uniform(60, 120)), (1.8, 1.8, 1.8))
    # lanterns hanging on vines from the canopy edge
    for x, y, z in ((-48, -24, 92), (46, -30, 116), (-10, -46, 92)):
        b.beam((x, y, z), (x, y, z - 10), 0.4, LEAF_D, var=0.0)
        lantern(b, g, (x, y, z - 13.5), 3.0, frame=DARK, glow=0xfff060)
    # lantern posts along the path
    for k in range(6):
        a = math.pi * (1.15 + k * 0.14)
        x, y = math.cos(a) * 62, math.sin(a) * 52
        b.beam((x, y, 0), (x, y, 21), 2.4, WOOD_D)
        b.beam((x - 1.6, y, 18), (x + 1.6, y, 18), 0.8, WOOD_D, var=0.0)
        lantern(b, g, (x, y, 25), 4.2, frame=DARK, glow=0xfff060)
    # glow mushrooms with spotted caps
    for k in range(10):
        a = math.pi * (1.1 + k * 0.088)
        x, y = math.cos(a) * 44, math.sin(a) * 38
        b.rod((x, y, 10), (x, y, 16.4), 1.3, WHITE, r1=1.0, seg=6)
        g.add("cone", (0x7ad8ff, 0xc08aff, 0xff8ad0)[k % 3], (x, y, 18), (8, 8, 5), seg=8)
        for j in range(3):
            aa = j / 3 * math.tau + k
            b.prim("box", WHITE, Mx((x + math.cos(aa) * 1.9, y + math.sin(aa) * 1.9, 18.7), (0.9, 0.9, 0.5), (0, 0, aa)), var=0.0)
    # owl on the right branch, pumpkins, stones, grass, flowers
    ox, oy, oz = 40, -2, 108
    b.prim("ico", 0x8a6a50, Mx((ox, oy, oz + 4), (6, 5.4, 8)), seg=1)
    for s in (-1, 1):
        b.prim("ico", WHITE, Mx((ox + s * 1.5, oy - 2.4, oz + 5.6), (2.4, 1.0, 2.4)), seg=1, var=0.0)
        b.prim("box", DARK, Mx((ox + s * 1.5, oy - 3.0, oz + 5.6), (1.0, 0.4, 1.0)), var=0.0)
        b.rod((ox + s * 1.8, oy, oz + 7.4), (ox + s * 2.6, oy, oz + 9.6), 0.8, 0x8a6a50, r1=0, seg=4)
    b.rod((ox, oy - 2.6, oz + 4.6), (ox, oy - 3.6, oz + 3.8), 0.5, GOLD, r1=0, seg=4)
    for x, y, s in ((30, -40, 6), (37, -36, 4.4)):
        for k in range(6):
            a = k / 6 * math.tau
            b.prim("ico", ORANGE, Mx((x + math.cos(a) * s * 0.28, y + math.sin(a) * s * 0.28, 10 + s * 0.42), (s * 0.55, s * 0.55, s * 0.8)), seg=1)
        b.rod((x, y, 10 + s * 0.75), (x + 0.5, y, 10 + s * 1.1), 0.5, LEAF_D, seg=4)
    for k in range(12):
        a = rng.uniform(0, math.tau)
        rock(b, (math.cos(a) * 58, math.sin(a) * 48, 9.5), (6, 5, 4), rng.choice((0x4a3e62, 0x564a70)))
    for k in range(26):
        a = rng.uniform(0, math.tau)
        rr = rng.uniform(34, 58)
        tuft(b, (math.cos(a) * rr, math.sin(a) * rr * 0.84, 10), rng.uniform(3, 5), cols=GR)
    for k in range(10):
        a = rng.uniform(0, math.tau)
        flower(b, (math.cos(a) * 54, math.sin(a) * 45, 10), 2.8, rng.choice((0xff8ad0, 0x7ad8ff, WHITE, 0xc08aff)))
    return []


def block_castle_hi(P):
    b, r = P["body"], P["roof"]
    rng = b.rng
    TOY = (RED, BLUE, GOLD, GREEN, PURPLE, ORANGE)
    LIGHT = {RED: 0xff7a6a, BLUE: 0x6a8aff, GOLD: 0xfff07a, GREEN: 0x8aea9a, PURPLE: 0xb88aff, ORANGE: 0xffa070}
    GLYPHS = {"A": (((0, 0), (0.5, 1)), ((1, 0), (0.5, 1)), ((0.25, 0.45), (0.75, 0.45))),
              "T": (((0, 1), (1, 1)), ((0.5, 1), (0.5, 0))),
              "H": (((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 0.5), (1, 0.5))),
              "L": (((0, 1), (0, 0)), ((0, 0), (0.8, 0))),
              "X": (((0, 0), (1, 1)), ((0, 1), (1, 0))),
              "E": (((0, 0), (0, 1)), ((0, 1), (0.9, 1)), ((0, 0.5), (0.7, 0.5)), ((0, 0), (0.9, 0)))}

    def emblem(c, n, s, kind, col):
        c, n = Vector(c), Vector(n).normalized()
        u = wall_u(n)
        if kind == "circle":
            q = n.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            b.prim("cone", col, Matrix.Translation(c + n * 0.4) @ q @ Matrix.Diagonal((s, s, 0.8, 1)), seg=10, r2=0.5)
        elif kind == "star":
            pts = [c + n * 0.8]
            for k in range(10):
                a = math.pi / 2 + k / 10 * math.tau
                rr = s * (0.5 if k % 2 == 0 else 0.22)
                pts.append(c + u * math.cos(a) * rr + UP * math.sin(a) * rr + n * 0.8)
            back = [p_ - n * 0.8 for p_ in pts[1:]]
            vs = pts + back
            faces = [(0, 1 + k, 1 + (k + 1) % 10) for k in range(10)] + [(1 + k, 1 + (k + 1) % 10, 11 + (k + 1) % 10, 11 + k) for k in range(10)]
            b.mesh(vs, faces, col, 0.0)
        else:
            for (x0, y0), (x1, y1) in GLYPHS[kind]:
                a = c + u * (x0 - 0.5) * s * 0.7 + UP * (y0 - 0.5) * s + n * 0.4
                bb = c + u * (x1 - 0.5) * s * 0.7 + UP * (y1 - 0.5) * s + n * 0.4
                d = (bb - a).normalized()
                b.beam(a - d * 0.7, bb + d * 0.7, 1.6, col, d=0.8, var=0.0)

    marks = ["A", "star", "X", "circle", "T", "star", "L", "circle", "H", "E"]
    mi = 0
    for i, x in enumerate(range(-60, 61, 20)):
        if x == 0:
            continue
        c = TOY[i % 6]
        b.add("box", c, (x, -24, 10), (20, 20, 20), bevel=1.4)
        emblem((x, -34, 10), (0, -1, 0), 11, marks[mi % len(marks)], WHITE if c != GOLD else RED)
        mi += 1
        if i % 2:
            c2 = TOY[(i + 2) % 6]
            b.add("box", c2, (x, -24, 28), (16, 16, 16), bevel=1.2)
            emblem((x, -32, 28), (0, -1, 0), 8.5, marks[mi % len(marks)], LIGHT[c2])
            mi += 1
    b.add("box", DARK, (0, -22, 10), (20, 4, 20))
    b.add("cyl", GOLD, (0, -24, 26), (36, 20, 20), rot=(math.pi / 2, 0, 0), seg=14)
    RAIN = (RED, ORANGE, GOLD, GREEN, BLUE, PURPLE, RED)
    for k in range(7):
        ta, tb = math.pi * k / 7 + 0.02, math.pi * (k + 1) / 7 - 0.02
        pts = [(math.cos(t) * rr, y, 26 + math.sin(t) * rr) for y in (-35.0, -33.6) for rr, t in ((11, ta), (11, tb), (17.4, tb), (17.4, ta))]
        b.hull(pts, RAIN[k])
    for i, x in enumerate(range(-60, 61, 30)):
        c = TOY[(i + 3) % 6]
        b.add("box", c, (x, 30, 14), (28, 20, 28), bevel=1.4)
        for k in range(3):  # wood-grain stripes on the big blocks' tops
            slab(b, (x - 8 + k * 8, 30, 28.1), (0, 1, 0), (-1, 0, 0), 16, 1.0, 0.4, LIGHT[c], var=0.0)
    for i, y in enumerate((-4, 14)):
        for x in (-70, 70):
            c = TOY[(i + (x > 0) * 2) % 6]
            b.add("box", c, (x, y, 10), (20, 18, 20), bevel=1.4)
            emblem((x + (10 if x > 0 else -10), y, 10), (1 if x > 0 else -1, 0, 0), 9, ("circle", "star")[i], WHITE)
    flags = []
    for x, c, rc in ((-84, BLUE, RED), (84, GREEN, PURPLE)):
        for k in range(4):
            b.add("cyl", c if k % 2 == 0 else LIGHT[c], (x, 4, 8 + k * 16), (28, 28, 15.2), seg=16)
        b.add("cyl", DARK, (x, 4, 32), (26, 26, 64), seg=10)
        b.add("cyl", GOLD, (x, 4, 63.5), (31, 31, 3), seg=16)
        for z in (20, 44):
            slab(b, (x, 4 - 14.2, z), (1, 0, 0), UP, 5, 8, 0.8, DARK, var=0.0)
            b.prim("cone", DARK, Mx((x, 4 - 14.2, z + 4), (5, 0.8, 5), (math.pi / 2, 0, 0)), seg=8)
            slab(b, (x, 4 - 14.6, z - 4.6), (1, 0, 0), UP, 7, 1.2, 1.6, WHITE, var=0.0)
        tile_cone(r, x, 4, 64.5, 18, 29.5, (rc, LIGHT[rc]), rows=4, n=16, core=rc)
        b.add("ico", GOLD, (x, 4, 94.5), (4, 4, 4))
        b.add("cyl", WHITE, (x, 4, 102), (2, 2, 16), seg=6)
        flags.append((x, 4, 110))
    for k in range(5):
        b.add("cyl", PURPLE if k % 2 == 0 else LIGHT[PURPLE], (0, 18, 10 + k * 20), (30, 30, 19.2), seg=16)
    b.add("cyl", DARK, (0, 18, 50), (28, 28, 100), seg=10)
    b.add("cyl", GOLD, (0, 18, 99.5), (33, 33, 3), seg=16)
    for z in (60, 82):
        slab(b, (0, 18 - 15.2, z), (1, 0, 0), UP, 5, 8, 0.8, DARK, var=0.0)
        b.prim("cone", DARK, Mx((0, 18 - 15.2, z + 4), (5, 0.8, 5), (math.pi / 2, 0, 0)), seg=8)
        slab(b, (0, 18 - 15.6, z - 4.6), (1, 0, 0), UP, 7, 1.2, 1.6, WHITE, var=0.0)
    tile_cone(r, 0, 18, 100.5, 19, 35.5, (GOLD, LIGHT[GOLD]), rows=5, n=16, core=GOLD)
    b.add("ico", RED, (0, 18, 136.5), (4, 4, 4))
    b.add("cyl", WHITE, (0, 18, 144), (2, 2, 16), seg=6)
    flags.append((0, 18, 152))
    for (x, y, c), m in zip(((-36, 6, ORANGE), (36, 8, BLUE)), ("A", "star")):
        b.add("box", c, (x, y, 7), (14, 14, 14), rot=(0, 0, 0.4), bevel=1.0)
        n = Matrix.Rotation(0.4, 3, 'Z') @ Vector((0, -1, 0))
        emblem(Vector((x, y, 7)) + n * 7, n, 7.5, m, WHITE)
    # bunting between the towers
    for x0, x1 in ((-84, 0), (0, 84)):
        a, bb = Vector((x0, 4, 60)), Vector((x1, 18, 92))
        pts = [a.lerp(bb, t) - UP * math.sin(t * math.pi) * 10 for t in (0, 0.25, 0.5, 0.75, 1)]
        for p0, p1 in zip(pts, pts[1:]):
            b.beam(p0, p1, 0.4, WHITE, var=0.0)
        for k in range(1, 8):
            t = k / 8
            q = a.lerp(bb, t) - UP * math.sin(t * math.pi) * 10
            dirv = (bb - a).normalized()
            b.mesh([q - dirv * 2.2, q + dirv * 2.2, q - UP * 5, q - dirv * 2.2 + Vector((0, 0.5, 0)), q + dirv * 2.2 + Vector((0, 0.5, 0)), q - UP * 5 + Vector((0, 0.5, 0))],
                   [(0, 1, 2), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)], TOY[k % 6], 0.0)
    # pencil, ball, marbles, a little block stair
    a, bb = Vector((40, -50, 2.2)), Vector((58, -38, 30))
    d = (bb - a).normalized()
    b.rod(a + d * 6, bb, 2.4, GOLD, seg=6)
    b.rod(a + d * 1.6, a + d * 6, 2.4, WOOD_L, r1=0.8, seg=6)
    b.rod(a, a + d * 1.6, 0.8, DARK, r1=0.1, seg=6)
    b.rod(bb, bb + d * 2.2, 2.5, 0x9a9aa8, seg=6)
    b.rod(bb + d * 2.2, bb + d * 5.2, 2.4, 0xff8ad0, seg=6)
    ball = b.prim("ico", RED, Mx((-50, -44, 7), (14, 14, 14)), seg=2, var=0.03)
    for i, f in enumerate(ball):
        cz = f.calc_center_median().z - 7
        col = (WHITE if abs(cz) < 1.6 else RED if cz > 0 else BLUE)
        for lp in f.loops:
            lp[b.col] = rgba(col)
    for k, (x, y) in enumerate(((-38, -46), (-34, -40), (-60, -36), (-28, -48))):
        b.prim("ico", (TEAL, PURPLE, GOLD, GREEN)[k], Mx((x, y, 1.6), (3.2, 3.2, 3.2)), seg=1, var=0.0)
    for k in range(3):
        b.add("box", TOY[(k + 1) % 6], (64 - k * 0.5, -10 + k * 0.4, 4 + k * 8), (8, 8, 8), rot=(0, 0, 0.2 * k), bevel=0.8)
    return flags


def mountain_hi(P):
    b, g = P["body"], P["glow_crater"]
    rng = b.rng
    MT, MT_D = 0x3a2e40, 0x2c2232
    MTS = (MT, MT_D, 0x4a3a50, 0x403448, 0x34283a)
    SUMMIT = 390.0

    def cone_mesh(cx, cy, levels, seg, jit, cols, zj=0.0):
        pts, faces = [], []
        for li, (z, rx, ry) in enumerate(levels):
            last = li == len(levels) - 1
            for k in range(seg):
                a = (k + (li % 2) * 0.5) / seg * math.tau
                j = 1 + (rng.uniform(-jit, jit) if 0 < li else rng.uniform(-jit, jit) * 0.5)
                zz = z + (rng.uniform(-zj, zj) if 0 < li < len(levels) - 1 else 0)
                pts.append((cx + math.cos(a) * rx * j, cy + math.sin(a) * ry * j, zz))
        for li in range(len(levels) - 1):
            A, B = li * seg, (li + 1) * seg
            for k in range(seg):
                k1 = (k + 1) % seg
                if li % 2 == 0:
                    faces += [(A + k, A + k1, B + k), (A + k1, B + k1, B + k)]
                else:
                    faces += [(A + k, A + k1, B + k1), (A + k, B + k1, B + k)]
        faces.append(tuple(range((len(levels) - 1) * seg, len(levels) * seg)))
        faces.append(tuple(range(seg)))
        b.mesh(pts, faces, [rng.choice(cols) for _ in faces], 0.06)

    R0x, R0y = 130, 120
    rad = lambda z: 1 - 0.88 * z / 370
    lv = [(z, R0x * rad(z), R0y * rad(z)) for z in (0, 40, 90, 150, 210, 270, 320, 352, 370)]
    cone_mesh(0, 0, lv, 18, 0.07, MTS, zj=6)
    for cx, cy, h, rx, ry, tp in ((-96, 34, 220, 75, 64, 0.15), (104, 42, 180, 66, 58, 0.16), (-40, -70, 80, 55, 35, 0.4)):
        cone_mesh(cx, cy, [(z, rx * (1 - (1 - tp) * z / h), ry * (1 - (1 - tp) * z / h)) for z in (0, h * 0.3, h * 0.6, h * 0.85, h)], 11, 0.1, (MT_D, 0x2c2232, 0x3a2e40), zj=4)
    # crags: faceted chunks stuck onto the slopes, bigger low down
    for k in range(120):
        z = 370 * (1 - math.sqrt(rng.uniform(0.02, 1.0)))
        a = rng.uniform(0, math.tau)
        if rng.random() < 0.45:
            a = rng.uniform(math.pi * 1.1, math.pi * 1.9)
        s = (38 - z / 370 * 26) * rng.uniform(0.7, 1.15)
        rr = rad(z) * 0.94
        rock(b, (math.cos(a) * R0x * rr, math.sin(a) * R0y * rr, z), (s * 1.2, s, s * 0.8), rng.choice(MTS), jit=0.14, zclamp=SUMMIT - 4)
    for cx, cy, h, rx, ry, tp in ((-96, 34, 220, 75, 64, 0.15), (104, 42, 180, 66, 58, 0.16)):
        for k in range(26):
            z = h * (1 - math.sqrt(rng.uniform(0.04, 1.0)))
            a = rng.uniform(math.pi * 0.9, math.pi * 2.1)
            f = 1 - (1 - tp) * z / h
            s = (26 - z / h * 16) * rng.uniform(0.7, 1.1)
            rock(b, (cx + math.cos(a) * rx * f * 0.92, cy + math.sin(a) * ry * f * 0.92, z), (s * 1.1, s, s * 0.9), rng.choice(MTS), jit=0.14, zclamp=h - 4)
    # strata ledges
    for z, a0, a1 in ((110, 1.05, 1.95), (210, 1.15, 1.85), (290, 0.9, 1.6)):
        n = 9
        for k in range(n):
            a = math.pi * (a0 + (a1 - a0) * (k + 0.5) / n)
            rr = rad(z) + 0.02
            c = Vector((math.cos(a) * R0x * rr, math.sin(a) * R0y * rr, z + rng.uniform(-3, 3)))
            u = Vector((-math.sin(a), math.cos(a), 0))
            slab(b, c, u, Vector((0, 0, 1)), R0x * rr * math.tau / (2 * n * 1.4) * (a1 - a0) * 2, 4.5, 10, rng.choice((0x4a3a50, 0x55456a)), back=True)
    # crater rim: chunks, the tallest exactly at the summit
    for k in range(12):
        a = k / 12 * math.tau
        top = SUMMIT if k % 3 == 0 else SUMMIT - rng.uniform(1.5, 4)
        h = 14 if k % 3 == 0 else 12
        rock(b, (math.cos(a) * 17.5, math.sin(a) * 16.5, top - h / 2), (rng.uniform(13, 15), rng.uniform(12, 14), h), rng.choice((MT_D, 0x4a3a50)),
             jit=0.0 if k % 3 == 0 else 0.1, rot=(0, 0, a), zclamp=SUMMIT)
    for k in range(10):
        a = (k + 0.5) / 10 * math.tau
        rock(b, (math.cos(a) * 24, math.sin(a) * 23, 372), (10, 9, 8), rng.choice(MTS), jit=0.12, zclamp=SUMMIT - 6)
    # the glow: crater, bubbles, lava rivulets with pools, crystals
    g.add("cone", 0xff6a2a, (0, 0, 378), (30, 30, 10), rot=(math.pi, 0, 0), seg=12)
    for k in range(5):
        a = k / 5 * math.tau
        g.add("ico", 0xffb040, (math.cos(a) * 6, math.sin(a) * 6, 382), (4, 4, 3))
    for a, z0, z1 in ((-math.pi / 2 + 0.12, 372, 236), (-math.pi / 2 - 0.5, 360, 290)):
        pts = []
        for j in range(7):
            z = z0 + (z1 - z0) * j / 6
            aa = a + math.sin(j * 1.3) * 0.08
            rr = rad(z) * 1.005
            pts.append(Vector((math.cos(aa) * R0x * rr, math.sin(aa) * R0y * rr, z)))
        for j, (p0, p1) in enumerate(zip(pts, pts[1:])):
            nrm = Vector((p0.x, p0.y, 0)).normalized()
            g.beam(p0 + nrm * 1.2, p1 + nrm * 1.2, 5 - j * 0.4, (0xff8a3a, 0xff6a2a)[j % 2], d=2.2, var=0.0)
        q = pts[-1] + Vector((pts[-1].x, pts[-1].y, 0)).normalized() * 2
        g.add("cyl", 0xff8a3a, tuple(q), (12, 9, 1.4), seg=8)
    CRY = (0xc08aff, 0x7ad8ff, 0xff8ad0)
    for k in range(8):
        z = rng.uniform(60, 300)
        a = rng.uniform(math.pi * 1.05, math.pi * 1.95)
        rr = rad(z) * 0.98
        base = Vector((math.cos(a) * R0x * rr, math.sin(a) * R0y * rr, z))
        out = Vector((math.cos(a), math.sin(a), 0.9)).normalized()
        col = CRY[k % 3]
        for j in range(4):
            dvec = (out + Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), rng.uniform(-0.1, 0.4)))).normalized()
            L = rng.uniform(8, 14) * (1.0 if j == 0 else 0.7)
            w = L * 0.22
            g.rod(base, base + dvec * L, w, col, seg=6)
            g.rod(base + dvec * L, base + dvec * (L + w * 1.6), w, col, r1=0, seg=6, caps=False)
    # little bare trees (spooky-cute: curly tips, a few purple leaves)
    for k in range(6):
        z = rng.uniform(20, 160)
        a = rng.uniform(math.pi * 1.1, math.pi * 1.9)
        rr = rad(z) * 1.0
        base = Vector((math.cos(a) * R0x * rr, math.sin(a) * R0y * rr, z - 2))
        out = Vector((math.cos(a), math.sin(a), 0))
        pts = [base, base + UP * 10 + out * 3, base + UP * 18 + out * 1, base + UP * 23 + out * 5]
        chain(b, pts, 1.8, 0.6, 0x2a2230, seg=5)
        for s in (-1, 1):
            side = Vector((-out.y, out.x, 0)) * s
            q = pts[1]
            chain(b, [q, q + side * 6 + UP * 4, q + side * 7 + UP * 7], 0.9, 0.3, 0x2a2230, seg=4)
            b.prim("ico", 0x8a4ae0, Mx(q + side * 7 + UP * 8, (3.6, 3.6, 3.0)), seg=1)
        b.prim("ico", 0x6a5aa0, Mx(pts[-1] + UP * 1.5, (5, 5, 4)), seg=1)
    # scree at the foot
    for k in range(50):
        a = rng.uniform(0, math.tau)
        rr = rng.uniform(1.0, 1.12)
        rock(b, (math.cos(a) * R0x * rr, math.sin(a) * R0y * rr, 2), (rng.uniform(6, 12), rng.uniform(5, 10), rng.uniform(3, 6)), rng.choice(MTS), jit=0.15)
    # pin the summit: nothing above z=390, and the rim's tall chunks touch it
    for part in (b, g):
        for v in part.bm.verts:
            if v.co.z > SUMMIT:
                v.co.z = SUMMIT
    return []


DESIGNS_HI = {
    "board-keep": keep_hi, "board-beacon": beacon_hi, "board-bog-shack": bog_shack_hi,
    "board-hollow-tree": hollow_tree_hi, "board-block-castle": block_castle_hi, "board-mountain": mountain_hi,
}


DESIGNS = {
    "board-keep": (keep, ["body", "roof", "glow_windows"]),
    "board-beacon": (beacon, ["body", "roof", "glow_lantern"]),
    "board-bog-shack": (bog_shack, ["body", "roof", "glow_lanterns"]),
    "board-hollow-tree": (hollow_tree, ["body", "roof", "glow_lights"]),
    "board-block-castle": (block_castle, ["body", "roof"]),
    "board-mountain": (mountain, ["body", "glow_crater"]),
}


# ---------------------------------------------------------------- build/export

def _material(name, emit):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    if emit:
        for key in ("Emission Color", "Emission"):
            if key in bsdf.inputs:
                nt.links.new(attr.outputs["Color"], bsdf.inputs[key])
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 1.5
    return m


def _filtered(op, kw):
    keys = op.get_rna_type().properties.keys()
    return {k: v for k, v in kw.items() if k in keys}


def build(ids=None, outdir=None, render=True, tier="lo"):
    """tier 'lo' = the original low-poly pieces; 'hi' = the mid-high detail pass (BUDGET_HI)."""
    if tier not in ("lo", "hi"):
        raise ValueError("tier must be 'lo' or 'hi'")
    ids = ids or list(DESIGNS)
    outdir = outdir or os.path.join(os.environ.get("TEMP", "/tmp"), "NOVUS_board")
    os.makedirs(outdir, exist_ok=True)
    win = None if bpy.app.background else getattr(bpy.context, "window", None)
    old_scene = win.scene if win else None
    report = {}
    for lid in ids:
        fn, parts = DESIGNS[lid]
        hi = tier == "hi"
        if hi:
            fn = DESIGNS_HI[lid]
        budget = (BUDGET_HI if hi else BUDGET)[lid]
        if win:  # GUI: a throwaway scene, the user's own scene is never touched
            sc = bpy.data.scenes.new("NOVUS_tmp_" + lid)
        else:  # headless (bpy module / --background): a fresh empty factory scene
            bpy.ops.wm.read_factory_settings(use_empty=True)
            sc = bpy.context.scene
        made = {"objects": [], "meshes": [], "materials": [], "other": []}
        try:
            if win:
                win.scene = sc
            rng = random.Random(lid)
            P = {n: Part(n, rng, fast=hi) for n in parts}
            flags = fn(P)
            mats = {"solid": _material("novus_vcol", False), "glow": _material("novus_glow", True)}
            made["materials"] += mats.values()
            obs = []
            for n, part in P.items():
                ob = part.to_object(sc.collection)
                ob.data.materials.append(mats["glow" if n.startswith("glow_") else "solid"])
                obs.append(ob)
                made["meshes"].append(ob.data)
            for i, pos in enumerate(flags, 1):
                obs.append(flag(sc.collection, i, pos))
            made["objects"] += obs
            vl = sc.view_layers[0]
            for ob in obs:
                ob.select_set(True, view_layer=vl)
            tris = 0
            for ob in obs:
                if ob.type == "MESH":
                    ob.data.calc_loop_triangles()
                    tris += len(ob.data.loop_triangles)
            if tris > budget:
                raise RuntimeError(f"{lid} ({tier}): {tris} triangles is over its {budget} budget")
            path = os.path.join(outdir, f"{lid}.glb")
            kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                      export_apply=True, export_cameras=False, export_lights=False,
                      export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                      export_animations=False, export_extras=False)
            if win:
                with bpy.context.temp_override(window=win, scene=sc, view_layer=vl):
                    bpy.ops.export_scene.gltf(**_filtered(bpy.ops.export_scene.gltf, kw))
            else:
                bpy.ops.export_scene.gltf(**_filtered(bpy.ops.export_scene.gltf, kw))
            info = {"glb": path, "bytes": os.path.getsize(path), "tris": tris,
                    "budget": budget, "tier": tier, "flags": len(flags), "objects": [o.name for o in obs]}
            if render:
                info["png"] = _render(sc, obs, os.path.join(outdir, f"{lid}.png"), made)
            report[lid] = info
        finally:
            if win and old_scene:
                win.scene = old_scene
            for ob in made["objects"]:
                bpy.data.objects.remove(ob, do_unlink=True)
            for o in made["other"]:
                coll = bpy.data.cameras if isinstance(o, bpy.types.Camera) else bpy.data.lights if isinstance(o, bpy.types.Light) else bpy.data.worlds
                try:
                    coll.remove(o)
                except Exception:
                    pass
            for me in made["meshes"]:
                if me.users == 0:
                    bpy.data.meshes.remove(me)
            for m in made["materials"]:
                if m.users == 0:
                    bpy.data.materials.remove(m)
            if win:
                bpy.data.scenes.remove(sc)
    return report


def _render(sc, obs, path, made):
    pts = [o.matrix_world @ Vector(c) for o in obs if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    mid, span = (lo + hi) / 2, max(hi - lo)
    cam = bpy.data.cameras.new("novus_cam")
    cam.type = 'ORTHO'
    cam.ortho_scale = span * 1.35
    cam.clip_end = span * 10
    co = bpy.data.objects.new("novus_cam", cam)
    d = Vector((0.55, -1.0, 0.75)).normalized()  # front-right, ~35-40 deg down
    co.location = mid + d * span * 3
    co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sun = bpy.data.lights.new("novus_sun", 'SUN')
    sun.energy = 3.5
    so = bpy.data.objects.new("novus_sun", sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))
    for o in (co, so):
        sc.collection.objects.link(o)
    made["objects"] += [co, so]
    world = bpy.data.worlds.new("novus_world")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = rgba(0x9ad0f0)
    bg.inputs[1].default_value = 0.9
    made["other"] += [cam, sun, world]
    sc.world, sc.camera = world, co
    # EEVEE on a real Blender with a GPU; Cycles on CPU when headless (bpy module, no GPU)
    engines = ("CYCLES",) if bpy.app.background else ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES")
    for eng in engines:
        try:
            sc.render.engine = eng
            break
        except Exception:
            pass
    if sc.render.engine == "CYCLES":
        sc.cycles.device = "CPU"
        sc.cycles.samples = 24
        sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = 448
    sc.render.film_transparent = False
    sc.render.filepath = path
    try:
        sc.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    win = None if bpy.app.background else getattr(bpy.context, "window", None)
    if win:
        with bpy.context.temp_override(window=win, scene=sc):
            bpy.ops.render.render(write_still=True, scene=sc.name)
    else:
        bpy.ops.render.render(write_still=True)
    return path


if __name__ == "__main__":
    import sys
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    tier = "lo"
    if "--tier" in argv:  # blender -b -P board_landmarks.py -- <outdir> [ids...] --tier hi
        i = argv.index("--tier")
        tier = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    print(build(argv[1:] or None, argv[0] if argv else None, tier=tier))
