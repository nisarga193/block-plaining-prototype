"""
STAGE 1F - Spatial Harmonization Layer.

Builds a NetworkX graph where every node is a shared block_section_id.
Each node carries the department-native ID ranges (Civil km chainage,
TRD mast range, S&T point/relay IDs) so that any incoming task -
regardless of which department's system it came from - can be resolved
to one common physical location.

This graph is the thing Stage 3 (the optimizer) depends on to know that
a Civil task and a TRD task are physically co-located and can be grouped
into one integrated shadow block.
"""
import networkx as nx

# Hardcoded sample division for the prototype. In production this table
# is populated once from the real asset register and updated only when
# new assets are commissioned.
SAMPLE_SECTIONS = [
    {"id": "DIV-NGP-340", "division": "Nagpur", "km_start": 338.0, "km_end": 340.5,
     "trd_mast_range": "Mast 45-A to 46-C", "st_point_ids": "Point 10-L",
     "trains_per_day": 85},
    {"id": "DIV-NGP-342", "division": "Nagpur", "km_start": 340.5, "km_end": 343.0,
     "trd_mast_range": "Mast 47-A to 48-B", "st_point_ids": "Point 12-L, Relay 4-A",
     "trains_per_day": 92},
    {"id": "DIV-NGP-345", "division": "Nagpur", "km_start": 343.0, "km_end": 346.0,
     "trd_mast_range": "Mast 48-C to 50-A", "st_point_ids": "Point 13-L",
     "trains_per_day": 78},
    {"id": "DIV-NGP-348", "division": "Nagpur", "km_start": 346.0, "km_end": 349.0,
     "trd_mast_range": "Mast 50-B to 52-A", "st_point_ids": "Point 14-L, Relay 5-A",
     "trains_per_day": 40},
    {"id": "DIV-NGP-351", "division": "Nagpur", "km_start": 349.0, "km_end": 352.0,
     "trd_mast_range": "Mast 52-B to 54-A", "st_point_ids": "Point 15-L",
     "trains_per_day": 15},
]


def build_spatial_graph() -> nx.Graph:
    """ Builds the harmonization graph with adjacency edges between
    physically neighboring sections (needed so the optimizer understands
    that a block on one section affects corridor availability on the next). """
    g = nx.Graph()
    for sec in SAMPLE_SECTIONS:
        g.add_node(sec["id"], **sec)

    # connect sections that are physically adjacent (sorted by km_start)
    ordered = sorted(SAMPLE_SECTIONS, key=lambda s: s["km_start"])
    for a, b in zip(ordered, ordered[1:]):
        g.add_edge(a["id"], b["id"], relation="adjacent")

    return g


def resolve_to_section(graph: nx.Graph, raw_asset_id: str, department: str) -> str:
    """
    Resolves a department-native asset ID to the shared block_section_id.
    This is the core function every incoming task from TMS/SMMS/TDMS passes
    through before it enters the rest of the system.

    department: "Civil" | "TRD" | "S&T"
    raw_asset_id examples:
      Civil -> "km 341.2"
      TRD   -> "Mast 47-B"
      S&T   -> "Point 12-L"
    """
    for node_id, data in graph.nodes(data=True):
        if department == "Civil" and raw_asset_id.startswith("km"):
            km_value = float(raw_asset_id.replace("km", "").strip())
            if data["km_start"] <= km_value <= data["km_end"]:
                return node_id
        elif department == "TRD" and raw_asset_id in data["trd_mast_range"]:
            return node_id
        elif department == "S&T" and raw_asset_id in data["st_point_ids"]:
            return node_id
    # fallback: nearest match not found, log for manual asset registration
    return "UNRESOLVED"


def get_neighbors(graph: nx.Graph, section_id: str):
    """ Returns adjacent block sections - used by the optimizer to account
    for corridor availability spillover effects. """
    if section_id not in graph:
        return []
    return list(graph.neighbors(section_id))
