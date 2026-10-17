"""TwinForge board landmarks, built by script in Blender (5.x, also 4.2+).

Our own low-poly designs per docs/BOARD_ART_REQUESTS.md section 2. Run inside
Blender (GUI or `blender --background --python`); call build(ids, outdir).

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

    def __init__(self, name, rng):
        self.name, self.rng = name, rng
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
        # every face this call created or rebuilt is still unmarked
        faces = [f for f in bm.faces if not f[self.done]]
        if jitter:
            for v in {v for f in faces for v in f.verts}:
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


def build(ids=None, outdir=None, render=True):
    ids = ids or list(DESIGNS)
    outdir = outdir or os.path.join(os.environ.get("TEMP", "/tmp"), "NOVUS_board")
    os.makedirs(outdir, exist_ok=True)
    win = None if bpy.app.background else getattr(bpy.context, "window", None)
    old_scene = win.scene if win else None
    report = {}
    for lid in ids:
        fn, parts = DESIGNS[lid]
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
            P = {n: Part(n, rng) for n in parts}
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
                    "budget": BUDGET[lid], "flags": len(flags), "objects": [o.name for o in obs]}
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
    print(build(argv[1:] or None, argv[0] if argv else None))
